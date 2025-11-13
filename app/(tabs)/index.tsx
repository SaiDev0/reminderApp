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
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Bill } from '../../lib/types';
import { format, isToday, isTomorrow, isPast, parseISO, differenceInDays } from 'date-fns';
import { Colors } from '../../constants/Colors';
import { checkAndUnlockAchievements, getUserStats } from '../../lib/gamification';

const { width, height } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = width - (CARD_MARGIN * 2);

export default function DashboardScreen() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const scrollY = new Animated.Value(0);

    useEffect(() => {
        checkUser();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchUpcomingBills();
                fetchUserStats();
            }
        }, [user])
    );

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            router.replace('/auth/login');
            return;
        }

        setUser(session.user);
        fetchUpcomingBills();
        fetchUserStats();
    };

    const fetchUserStats = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const userStats = await getUserStats(user.id);
        setStats(userStats);
    };

    const fetchUpcomingBills = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];

            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .gte('due_date', today)
                .lte('due_date', thirtyDaysFromNow)
                .eq('status', 'pending')
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

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchUpcomingBills();
        fetchUserStats();
    }, []);

    const getStatusInfo = (bill: Bill) => {
        const dueDate = parseISO(bill.due_date);
        const daysUntil = differenceInDays(dueDate, new Date());

        if (bill.status === 'paid') {
            return { color: Colors.status.paid.color, bg: Colors.status.paid.bg, text: 'Paid', icon: 'checkmark-circle' };
        }
        if (bill.status === 'overdue' || isPast(dueDate)) {
            return { color: Colors.status.overdue.color, bg: Colors.status.overdue.bg, text: 'Overdue', icon: 'alert-circle' };
        }
        if (isToday(dueDate)) {
            return { color: Colors.status.due_today.color, bg: Colors.status.due_today.bg, text: 'Due Today', icon: 'time' };
        }
        if (isTomorrow(dueDate)) {
            return { color: Colors.status.due_soon.color, bg: Colors.status.due_soon.bg, text: 'Tomorrow', icon: 'calendar' };
        }
        if (daysUntil <= 7) {
            return { color: Colors.status.due_soon.color, bg: Colors.status.due_soon.bg, text: `${daysUntil} days`, icon: 'calendar-outline' };
        }
        return { color: Colors.status.pending.color, bg: Colors.status.pending.bg, text: `${daysUntil} days`, icon: 'calendar-outline' };
    };

    const getCategoryInfo = (category: string) => {
        const categoryData = (Colors.category as any)[category];
        return categoryData || Colors.category.other;
    };

    const getCategoryIcon = (category: string) => {
        const icons: any = {
            utilities: 'flash',
            subscriptions: 'tv',
            insurance: 'shield',
            rent: 'home',
            loans: 'card',
            credit_card: 'card-outline',
            other: 'ellipsis-horizontal',
        };
        return icons[category] || 'document';
    };

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

            fetchUpcomingBills();
            fetchUserStats();

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

    const renderRightActions = (bill: Bill, progress: Animated.AnimatedInterpolation<number>) => {
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
                    onPress={() => router.push(`/bill/${bill.id}`)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={Colors.gradient.blue}
                        style={styles.swipeGradient}
                    >
                        <Ionicons name="create-outline" size={24} color="white" />
                        <Text style={styles.swipeText}>Edit</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderBillCard = ({ item, index }: { item: Bill; index: number }) => {
        const statusInfo = getStatusInfo(item);
        const categoryInfo = getCategoryInfo(item.category);
        const icon = getCategoryIcon(item.category);

        return (
            <Animated.View style={{ opacity: 1, transform: [{ translateY: 0 }] }}>
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
                        {/* Category Color Bar */}
                        <LinearGradient
                            colors={categoryInfo.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.categoryBar}
                        />

                        <View style={styles.billCardContent}>
                            {/* Left Section */}
                            <View style={styles.billLeft}>
                                <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.light }]}>
                                    <Ionicons name={icon} size={24} color={categoryInfo.color} />
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
                                        {item.auto_pay && (
                                            <View style={styles.autoBadge}>
                                                <Ionicons name="flash" size={10} color={Colors.warning} />
                                                <Text style={styles.autoText}>Auto</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* Right Section */}
                            <View style={styles.billRight}>
                                <Text style={styles.billAmount}>${parseFloat(item.amount.toString()).toFixed(2)}</Text>
                                <Text style={styles.billDate}>{format(parseISO(item.due_date), 'MMM d')}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Swipeable>
            </Animated.View>
        );
    };

    const renderHeader = () => {
        const overdueBills = bills.filter(b => isPast(parseISO(b.due_date)));
        const dueTodayBills = bills.filter(b => isToday(parseISO(b.due_date)));
        const totalUpcoming = bills.reduce((sum, b) => sum + parseFloat(b.amount.toString()), 0);

        return (
            <View style={styles.headerContainer}>
                {/* Hero Card */}
                <LinearGradient
                    colors={Colors.gradient.sunset}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroContent}>
                        <View style={styles.heroTop}>
                            <View>
                                <Text style={styles.greeting}>Dashboard</Text>
                                <Text style={styles.subtitle}>Your financial overview</Text>
                            </View>
                            {stats && stats.current_streak > 0 && (
                                <TouchableOpacity
                                    style={styles.streakBadge}
                                    onPress={() => router.push('/achievements')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.streakEmoji}>🔥</Text>
                                    <Text style={styles.streakText}>{stats.current_streak}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.totalCard}>
                            <Text style={styles.totalLabel}>TOTAL DUE</Text>
                            <Text style={styles.totalAmount}>${totalUpcoming.toFixed(2)}</Text>
                            <Text style={styles.totalSubtext}>{bills.length} bills • Next 30 days</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.gradient.blue[0] + '20' }]}>
                            <Ionicons name="calendar-outline" size={20} color={Colors.gradient.blue[0]} />
                        </View>
                        <Text style={styles.statValue}>{bills.length}</Text>
                        <Text style={styles.statLabel}>Upcoming</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
                        <View style={[styles.statIcon, { backgroundColor: dueTodayBills.length > 0 ? Colors.status.due_today.bg : Colors.status.pending.bg }]}>
                            <Ionicons
                                name="time-outline"
                                size={20}
                                color={dueTodayBills.length > 0 ? Colors.status.due_today.color : Colors.text.secondary}
                            />
                        </View>
                        <Text style={styles.statValue}>{dueTodayBills.length}</Text>
                        <Text style={styles.statLabel}>Due Today</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
                        <View style={[styles.statIcon, { backgroundColor: overdueBills.length > 0 ? Colors.status.overdue.bg : Colors.status.paid.bg }]}>
                            <Ionicons
                                name={overdueBills.length > 0 ? "alert-circle-outline" : "checkmark-circle-outline"}
                                size={20}
                                color={overdueBills.length > 0 ? Colors.status.overdue.color : Colors.status.paid.color}
                            />
                        </View>
                        <Text style={styles.statValue}>{overdueBills.length}</Text>
                        <Text style={styles.statLabel}>{overdueBills.length > 0 ? 'Overdue' : 'On Track'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Section Header */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Upcoming Bills</Text>
                    <TouchableOpacity onPress={() => router.push('/budget')} activeOpacity={0.7}>
                        <Text style={styles.sectionLink}>View All →</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <Animated.FlatList
                data={bills}
                renderItem={renderBillCard}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <LinearGradient
                            colors={Colors.gradient.primary}
                            style={styles.emptyIcon}
                        >
                            <Ionicons name="checkmark-circle" size={48} color="white" />
                        </LinearGradient>
                        <Text style={styles.emptyTitle}>All Caught Up! 🎉</Text>
                        <Text style={styles.emptyText}>
                            No upcoming bills. Add your first bill to get started.
                        </Text>
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
                                <Text style={styles.emptyButtonText}>Add Your First Bill</Text>
                            </LinearGradient>
                        </TouchableOpacity>
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
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            />

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/bill/add')}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={Colors.gradient.sunset}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={28} color="white" />
                </LinearGradient>
            </TouchableOpacity>
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
    listContent: {
        paddingBottom: 100,
    },
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
    },
    // Hero Card
    heroCard: {
        marginHorizontal: CARD_MARGIN,
        marginBottom: 20,
        borderRadius: 24,
        ...Colors.shadow.lg,
    },
    heroContent: {
        padding: 24,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '800',
        color: 'white',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    streakEmoji: {
        fontSize: 18,
        marginRight: 4,
    },
    streakText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    totalCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.9)',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    totalAmount: {
        fontSize: 48,
        fontWeight: '800',
        color: 'white',
        marginBottom: 4,
    },
    totalSubtext: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '500',
    },
    // Stats Row
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: CARD_MARGIN,
        marginBottom: 24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        ...Colors.shadow.sm,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.text.secondary,
        fontWeight: '500',
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: CARD_MARGIN,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    sectionLink: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
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
    autoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warning + '20',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 2,
    },
    autoText: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.warning,
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
        fontSize: 13,
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
        paddingVertical: 16,
        paddingHorizontal: 32,
        gap: 8,
    },
    emptyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    // FAB
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        borderRadius: 28,
        ...Colors.shadow.colored,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

