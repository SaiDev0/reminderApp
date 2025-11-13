import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bill, PaymentHistory } from './types';

const BILLS_CACHE_KEY = '@bills_cache';
const HISTORY_CACHE_KEY = '@history_cache';
const LAST_SYNC_KEY = '@last_sync';

export async function cacheBills(bills: Bill[]): Promise<void> {
    try {
        await AsyncStorage.setItem(BILLS_CACHE_KEY, JSON.stringify(bills));
        await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch (error) {
        console.error('Error caching bills:', error);
    }
}

export async function getCachedBills(): Promise<Bill[] | null> {
    try {
        const cached = await AsyncStorage.getItem(BILLS_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error getting cached bills:', error);
        return null;
    }
}

export async function cacheHistory(history: PaymentHistory[]): Promise<void> {
    try {
        await AsyncStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Error caching history:', error);
    }
}

export async function getCachedHistory(): Promise<PaymentHistory[] | null> {
    try {
        const cached = await AsyncStorage.getItem(HISTORY_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error getting cached history:', error);
        return null;
    }
}

export async function getLastSyncTime(): Promise<Date | null> {
    try {
        const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
        return lastSync ? new Date(lastSync) : null;
    } catch (error) {
        console.error('Error getting last sync time:', error);
        return null;
    }
}

export async function clearCache(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([BILLS_CACHE_KEY, HISTORY_CACHE_KEY, LAST_SYNC_KEY]);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// Queue for offline operations
interface OfflineOperation {
    id: string;
    type: 'insert' | 'update' | 'delete';
    table: string;
    data: any;
    timestamp: string;
}

const OPERATIONS_QUEUE_KEY = '@operations_queue';

export async function queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): Promise<void> {
    try {
        const queue = await getOperationsQueue();
        const newOperation: OfflineOperation = {
            ...operation,
            id: `${Date.now()}_${Math.random()}`,
            timestamp: new Date().toISOString(),
        };
        queue.push(newOperation);
        await AsyncStorage.setItem(OPERATIONS_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('Error queueing operation:', error);
    }
}

export async function getOperationsQueue(): Promise<OfflineOperation[]> {
    try {
        const queue = await AsyncStorage.getItem(OPERATIONS_QUEUE_KEY);
        return queue ? JSON.parse(queue) : [];
    } catch (error) {
        console.error('Error getting operations queue:', error);
        return [];
    }
}

export async function clearOperationsQueue(): Promise<void> {
    try {
        await AsyncStorage.removeItem(OPERATIONS_QUEUE_KEY);
    } catch (error) {
        console.error('Error clearing operations queue:', error);
    }
}

export async function removeOperationFromQueue(operationId: string): Promise<void> {
    try {
        const queue = await getOperationsQueue();
        const updatedQueue = queue.filter(op => op.id !== operationId);
        await AsyncStorage.setItem(OPERATIONS_QUEUE_KEY, JSON.stringify(updatedQueue));
    } catch (error) {
        console.error('Error removing operation from queue:', error);
    }
}

