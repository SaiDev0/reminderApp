import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    TextInput,
    ScrollView,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Bill, BillCategory } from '../../lib/types';
import { format, parseISO } from 'date-fns';
import { Colors } from '../../constants/Colors';

export default function BillsScreen() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<BillCategory | 'all'>('all');

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchBills();
        }, [])
    );

    useEffect(() => {
        applyFilters();
    }, [bills, searchQuery, filterCategory]);

    const fetchBills = async () => {
        try {
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .order('due_date', { ascending: true });

            if (error) throw error;

            setBills(data || []);
        } catch (error) {
            console.error('Error fetching bills:', error);
            Alert.alert('Error', 'Failed to load bills');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...bills];

        // Apply category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter(bill => bill.category === filterCategory);
        }

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(bill =>
                bill.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredBills(filtered);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBills();
    }, []);

    const deleteBill = async (billId: string) => {
        try {
            const { error } = await supabase
                .from('bills')
                .delete()
                .eq('id', billId);

            if (error) throw error;

            setBills(bills.filter(b => b.id !== billId));
            Alert.alert('Success', 'Bill deleted successfully');
        } catch (error) {
            console.error('Error deleting bill:', error);
            Alert.alert('Error', 'Failed to delete bill');
        }
    };

    const confirmDelete = (bill: Bill) => {
        Alert.alert(
            'Delete Bill',
            `Are you sure you want to delete "${bill.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteBill(bill.id) },
            ]
        );
    };

    const handleMarkAsPaid = async (bill: Bill) => {
        try {
            // Add to payment history
            const { error: historyError } = await supabase
                .from('payment_history')
                .insert({
                    bill_id: bill.id,
                    paid_date: new Date().toISOString().split('T')[0],
                    amount: bill.amount,
                });

            if (historyError) throw historyError;

            // Update bill status
            const { error: billError } = await supabase
                .from('bills')
                .update({ status: 'paid' })
                .eq('id', bill.id);

            if (billError) throw billError;

            // If recurring, update to next due date
            if (bill.frequency !== 'once') {
                const nextDueDate = calculateNextDueDate(bill.due_date, bill.frequency);
                await supabase
                    .from('bills')
                    .update({
                        due_date: nextDueDate,
                        status: 'pending',
                    })
                    .eq('id', bill.id);
            }

            // Refresh the list
            fetchBills();

            Alert.alert('✅ Paid!', `${bill.name} marked as paid`);
        } catch (error) {
            console.error('Error marking bill as paid:', error);
            Alert.alert('Error', 'Failed to mark bill as paid');
        }
    };

    const calculateNextDueDate = (currentDate: string, frequency: string): string => {
        const date = new Date(currentDate);
        switch (frequency) {
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'bi-weekly':
                date.setDate(date.getDate() + 14);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'bi-monthly':
                date.setMonth(date.getMonth() + 2);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'semi-annually':
                date.setMonth(date.getMonth() + 6);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }
        return date.toISOString().split('T')[0];
    };

    const renderRightActions = (bill: Bill, progress: Animated.AnimatedInterpolation<number>) => {
        const translateX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [100, 0],
        });

        return (
            <Animated.View style={[styles.swipeActions, { transform: [{ translateX }] }]}>
                <TouchableOpacity
                    style={styles.markPaidButton}
                    onPress={() => handleMarkAsPaid(bill)}
                >
                    <LinearGradient
                        colors={Colors.gradient.success}
                        style={styles.swipeActionGradient}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="white" />
                        <Text style={styles.swipeActionText}>Paid</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderLeftActions = (bill: Bill, progress: Animated.AnimatedInterpolation<number>) => {
        const translateX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-100, 0],
        });

        return (
            <Animated.View style={[styles.swipeActions, { transform: [{ translateX }] }]}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(bill)}
                >
                    <LinearGradient
                        colors={Colors.gradient.danger}
                        style={styles.swipeActionGradient}
                    >
                        <Ionicons name="trash-outline" size={24} color="white" />
                        <Text style={styles.swipeActionText}>Delete</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderBillItem = ({ item }: { item: Bill }) => (
        <Swipeable
            renderRightActions={(progress) => renderRightActions(item, progress)}
            renderLeftActions={(progress) => renderLeftActions(item, progress)}
            overshootRight={false}
            overshootLeft={false}
        >
            <TouchableOpacity
                style={styles.billCard}
                onPress={() => router.push(`/bill/${item.id}`)}
                onLongPress={() => confirmDelete(item)}
            >
                <View style={styles.billHeader}>
                    <View style={styles.billInfo}>
                        <Text style={styles.billName}>{item.name}</Text>
                        <Text style={styles.billCategory}>{item.category}</Text>
                    </View>
                    <Text style={styles.billAmount}>${item.amount}</Text>
                </View>

                <View style={styles.billFooter}>
                    <View style={styles.dueDateContainer}>
                        <Ionicons name="calendar" size={16} color="#666" />
                        <Text style={styles.dueDate}>
                            {format(parseISO(item.due_date), 'MMM dd, yyyy')}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>

                {item.frequency !== 'once' && (
                    <View style={styles.frequencyBadge}>
                        <Ionicons name="repeat" size={14} color="#007AFF" />
                        <Text style={styles.frequencyText}>{item.frequency}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Swipeable>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#4CAF50';
            case 'overdue': return '#F44336';
            default: return '#007AFF';
        }
    };

    const categories: Array<BillCategory | 'all'> = [
        'all', 'utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'credit_card', 'other'
    ];

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search bills..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
            >
                {categories.map((item) => (
                    <TouchableOpacity
                        key={item}
                        style={[
                            styles.categoryChip,
                            filterCategory === item && styles.categoryChipActive
                        ]}
                        onPress={() => setFilterCategory(item)}
                        activeOpacity={0.7}
                    >
                        {filterCategory === item ? (
                            <LinearGradient
                                colors={Colors.gradient.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.categoryChipGradient}
                            >
                                <Text style={styles.categoryChipTextActive}>
                                    {item === 'all' ? 'All' : item.replace('_', ' ')}
                                </Text>
                            </LinearGradient>
                        ) : (
                            <Text style={styles.categoryChipText}>
                                {item === 'all' ? 'All' : item.replace('_', ' ')}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={filteredBills}
                renderItem={renderBillItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No bills found</Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery || filterCategory !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Add your first bill to get started'}
                        </Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/bill/add')}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </GestureHandlerRootView>
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
    },
    categoriesContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    categoryChip: {
        marginRight: 8,
        borderRadius: 24,
        overflow: 'hidden',
        height: 40,
        justifyContent: 'center',
    },
    categoryChipGradient: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryChipActive: {
        // Handled by gradient
    },
    categoryChipText: {
        fontSize: 14,
        color: Colors.text.secondary,
        textTransform: 'capitalize',
        fontWeight: '600',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Colors.card,
        borderRadius: 24,
        overflow: 'hidden',
        ...Colors.shadow.sm,
    },
    categoryChipTextActive: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    billCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    billHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    billInfo: {
        flex: 1,
    },
    billName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    billCategory: {
        fontSize: 14,
        color: '#666',
        textTransform: 'capitalize',
    },
    billAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    billFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dueDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dueDate: {
        marginLeft: 4,
        fontSize: 14,
        color: '#666',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    frequencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    frequencyText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#007AFF',
        textTransform: 'capitalize',
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
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    swipeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
    },
    markPaidButton: {
        marginRight: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    deleteButton: {
        marginLeft: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    swipeActionGradient: {
        width: 90,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    swipeActionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
});

