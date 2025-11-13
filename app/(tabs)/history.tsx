import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { PaymentHistory } from '../../lib/types';
import { format, parseISO } from 'date-fns';

interface PaymentWithBill extends PaymentHistory {
    bill_name: string;
}

export default function HistoryScreen() {
    const [history, setHistory] = useState<PaymentWithBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_history')
                .select(`
          *,
          bills (name)
        `)
                .order('paid_date', { ascending: false })
                .limit(100);

            if (error) throw error;

            const formattedData = data?.map(item => ({
                ...item,
                bill_name: item.bills?.name || 'Unknown Bill',
            })) || [];

            setHistory(formattedData);
        } catch (error) {
            console.error('Error fetching history:', error);
            Alert.alert('Error', 'Failed to load payment history');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchHistory();
    }, []);

    const getTotalPaid = () => {
        return history.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
    };

    const renderHistoryItem = ({ item }: { item: PaymentWithBill }) => (
        <View style={styles.historyCard}>
            <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            </View>

            <View style={styles.historyInfo}>
                <Text style={styles.billName}>{item.bill_name}</Text>
                <Text style={styles.paidDate}>
                    Paid on {format(parseISO(item.paid_date), 'MMM dd, yyyy')}
                </Text>
                {item.notes && (
                    <Text style={styles.notes}>{item.notes}</Text>
                )}
            </View>

            <View style={styles.amountContainer}>
                <Text style={styles.amount}>${parseFloat(item.amount.toString()).toFixed(2)}</Text>
            </View>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.summaryCard}>
                <Ionicons name="wallet" size={32} color="#4CAF50" />
                <View style={styles.summaryInfo}>
                    <Text style={styles.summaryLabel}>Total Paid</Text>
                    <Text style={styles.summaryValue}>${getTotalPaid().toFixed(2)}</Text>
                </View>
            </View>
            <Text style={styles.sectionTitle}>Payment History</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={history}
                renderItem={renderHistoryItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No payment history</Text>
                        <Text style={styles.emptySubtext}>
                            Payments you make will appear here
                        </Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    header: {
        marginBottom: 20,
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryInfo: {
        marginLeft: 16,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    historyCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        marginRight: 12,
    },
    historyInfo: {
        flex: 1,
    },
    billName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    paidDate: {
        fontSize: 14,
        color: '#666',
    },
    notes: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        fontStyle: 'italic',
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
});

