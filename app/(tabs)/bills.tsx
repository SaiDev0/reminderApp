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
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Bill, BillCategory } from '../../lib/types';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { Colors } from '../../constants/Colors';
import { checkAndUnlockAchievements } from '../../lib/gamification';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 16;

const categories: Array<{ id: BillCategory | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'utilities', label: 'Utilities', icon: 'flash' },
    { id: 'subscriptions', label: 'Subscriptions', icon: 'tv' },
    { id: 'insurance', label: 'Insurance', icon: 'shield' },
    { id: 'rent', label: 'Rent', icon: 'home' },
    { id: 'loans', label: 'Loans', icon: 'card' },
    { id: 'credit_card', label: 'Credit Card', icon: 'card-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function BillsScreen() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<BillCategory | 'all'>('all');
    const scrollY = new Animated.Value(0);

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

        if (filterCategory !== 'all') {
            filtered = filtered.filter(bill => bill.category === filterCategory);
        }

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

    const handleMarkAsPaid = async (bill: Bill) => {
        try {
            const { error: historyError } = await supabase
                .from('payment_history')
                .insert({
                    bill_id: bill.id,
                    paid_date: new Date().toISOString().split('T')[0],
                    amount: bill.amount,
                });

            if (historyError) throw historyError;

            const { error: billError } = await supabase
                .from('bills')
                .update({ status: 'paid' })
                .eq('id', bill.id);

            if (billError) throw billError;

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

            fetchBills();

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await checkAndUnlockAchievements(user.id);
            }

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

    const deleteBill = async (billId: string) => {
        try {
            const { error } = await supabase
                .from('bills')
                .delete()
                .eq('id', billId);

            if (error) throw error;

            setBills(bills.filter(b => b.id !== billId));
            Alert.alert('✅ Deleted', 'Bill removed successfully');
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

    const getStatusInfo = (bill: Bill) => {
        const dueDate = parseISO(bill.due_date);
        const daysUntil = differenceInDays(dueDate, new Date());

        if (bill.status === 'paid') {
            return { color: Colors.status.paid.color, bg: Colors.status.paid.bg, text: 'Paid', icon: 'checkmark-circle' };
        }
        if (isPast(dueDate) && bill.status !== 'paid') {
            return { color: Colors.status.overdue.color, bg: Colors.status.overdue.bg, text: 'Overdue', icon: 'alert-circle' };
        }
        if (isToday(dueDate)) {
            return { color: Colors.status.due_today.color, bg: Colors.status.due_today.bg, text: 'Due Today', icon: 'time' };
        }
        if (daysUntil <= 7 && daysUntil > 0) {
            return { color: Colors.status.due_soon.color, bg: Colors.status.due_soon.bg, text: `${daysUntil}d`, icon: 'calendar' };
        }
        return { color: Colors.status.pending.color, bg: Colors.status.pending.bg, text: `${daysUntil}d`, icon: 'calendar-outline' };
    };

    const getCategoryInfo = (category: string) => {
        return (Colors.category as any)[category] || Colors.category.other;
    };

    const renderRightActions = (bill: Bill, progress: Animated.AnimatedInterpolation<number>) => {
        if (bill.status === 'paid') return null;

        const translateX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [80, 0],
        });

        return (
            <Animated.View style={[styles.swipeAction, { transform: [{ translateX }] }]}>
                <TouchableOpacity
                    style={styles.swipeButton}
                    onPress={() => handleMarkAsPaid(bill)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={Colors.gradient.success}
                        style={styles.swipeGradient}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="white" />
                        <Text style={styles.swipeText}>Paid</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderLeftActions = (bill: Bill, progress: Animated.AnimatedInterpolation<number>) => {
        const translateX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-80, 0],
        });

        return (
            <Animated.View style={[styles.swipeAction, { transform: [{ translateX }] }]}>
                <TouchableOpacity
                    style={styles.swipeButton}
                    onPress={() => confirmDelete(bill)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={Colors.gradient.danger}
                        style={styles.swipeGradient}
                    >
                        <Ionicons name="trash-outline" size={24} color="white" />
                        <Text style={styles.swipeText}>Delete</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderBillCard = ({ item, index }: { item: Bill; index: number }) => {
        const statusInfo = getStatusInfo(item);
        const categoryInfo = getCategoryInfo(item.category);
        const categoryData = categories.find(c => c.id === item.category);

        return (
            <Swipeable
                renderRightActions={(progress) => renderRightActions(item, progress)}
                renderLeftActions={(progress) => renderLeftActions(item, progress)}
                overshootRight={false}
                overshootLeft={false}
            >
                <TouchableOpacity
                    style={styles.billCard}
                    onPress={() => router.push(`/bill/${item.id}`)}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={categoryInfo.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.categoryBar}
                    />

                    <View style={styles.billCardContent}>
                        <View style={styles.billLeft}>
                            <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.light }]}>
                                <Ionicons name={categoryData?.icon as any} size={24} color={categoryInfo.color} />
                            </View>

                            <View style={styles.billInfo}>
                                <Text style={styles.billName} numberOfLines={1}>{item.name}</Text>
                                <View style={styles.billMeta}>
                                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                                        <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
                                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                                            {statusInfo.text}
                                        </Text>
                                    </View>
                                    <View style={styles.frequencyBadge}>
                                        <Ionicons name="repeat" size={10} color={Colors.text.secondary} />
                                        <Text style={styles.frequencyText}>
                                            {item.frequency === 'once' ? 'One-time' : item.frequency}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.billRight}>
                            <Text style={styles.billAmount}>${parseFloat(item.amount.toString()).toFixed(2)}</Text>
                            <Text style={styles.billDate}>{format(parseISO(item.due_date), 'MMM d, yyyy')}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.text.secondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search bills..."
                    placeholderTextColor={Colors.text.secondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={20} color={Colors.text.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Category Pills */}
            <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.categoriesContent}
                renderItem={({ item }) => {
                    const isActive = filterCategory === item.id;
                    const categoryInfo = item.id !== 'all' ? getCategoryInfo(item.id) : null;

                    return (
                        <TouchableOpacity
                            style={[
                                styles.categoryPill,
                                isActive && styles.categoryPillActive,
                            ]}
                            onPress={() => setFilterCategory(item.id)}
                            activeOpacity={0.8}
                        >
                            {isActive && categoryInfo && (
                                <LinearGradient
                                    colors={categoryInfo.gradient}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            {isActive && item.id === 'all' && (
                                <LinearGradient
                                    colors={Colors.gradient.primary}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <Ionicons
                                name={item.icon as any}
                                size={16}
                                color={isActive ? 'white' : Colors.text.secondary}
                                style={styles.categoryPillIcon}
                            />
                            <Text style={[
                                styles.categoryPillText,
                                isActive && styles.categoryPillTextActive
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Results Summary */}
            <View style={styles.resultsSummary}>
                <Text style={styles.resultsText}>
                    {filteredBills.length} {filteredBills.length === 1 ? 'bill' : 'bills'}
                    {filterCategory !== 'all' && ` in ${categories.find(c => c.id === filterCategory)?.label}`}
                    {searchQuery && ` matching "${searchQuery}"`}
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.title}>All Bills</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push('/bill/add')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add-circle" size={28} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredBills}
                renderItem={renderBillCard}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <LinearGradient
                            colors={Colors.gradient.primary}
                            style={styles.emptyIcon}
                        >
                            <Ionicons
                                name={searchQuery || filterCategory !== 'all' ? "search" : "document-text"}
                                size={48}
                                color="white"
                            />
                        </LinearGradient>
                        <Text style={styles.emptyTitle}>
                            {searchQuery || filterCategory !== 'all' ? 'No bills found' : 'No bills yet'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {searchQuery || filterCategory !== 'all'
                                ? 'Try adjusting your filters or search query'
                                : 'Add your first bill to get started'
                            }
                        </Text>
                        {!searchQuery && filterCategory === 'all' && (
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => router.push('/bill/add')}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={Colors.gradient.primary}
                                    style={styles.emptyButtonGradient}
                                >
                                    <Ionicons name="add-circle-outline" size={20} color="white" />
                                    <Text style={styles.emptyButtonText}>Add Bill</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                    />
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: CARD_MARGIN,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
        backgroundColor: Colors.background,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    addButton: {
        padding: 4,
    },
    listContent: {
        paddingBottom: 100,
    },
    headerContainer: {
        paddingBottom: 16,
    },
    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        marginHorizontal: CARD_MARGIN,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        ...Colors.shadow.sm,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.text.primary,
    },
    // Categories
    categoriesContent: {
        paddingHorizontal: CARD_MARGIN,
        paddingBottom: 16,
        gap: 8,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: Colors.card,
        marginRight: 8,
        overflow: 'hidden',
        ...Colors.shadow.xs,
    },
    categoryPillActive: {
        ...Colors.shadow.sm,
    },
    categoryPillIcon: {
        marginRight: 6,
    },
    categoryPillText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.secondary,
    },
    categoryPillTextActive: {
        color: 'white',
    },
    // Results
    resultsSummary: {
        paddingHorizontal: CARD_MARGIN,
        paddingBottom: 12,
    },
    resultsText: {
        fontSize: 14,
        color: Colors.text.secondary,
        fontWeight: '500',
    },
    // Bill Cards
    billCard: {
        marginHorizontal: CARD_MARGIN,
        marginBottom: 12,
        backgroundColor: Colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        ...Colors.shadow.sm,
    },
    categoryBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    billCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingLeft: 20,
    },
    billLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    billInfo: {
        flex: 1,
    },
    billName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 6,
    },
    billMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    frequencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 3,
    },
    frequencyText: {
        fontSize: 10,
        fontWeight: '500',
        color: Colors.text.secondary,
        textTransform: 'capitalize',
    },
    billRight: {
        alignItems: 'flex-end',
    },
    billAmount: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    billDate: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.text.secondary,
    },
    // Swipe Actions
    swipeAction: {
        justifyContent: 'center',
        marginBottom: 12,
    },
    swipeButton: {
        width: 80,
        height: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    swipeGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    swipeText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    emptyButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    emptyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        gap: 8,
    },
    emptyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
