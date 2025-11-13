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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Bill } from '../../lib/types';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        checkUser();
    }, []);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchUpcomingBills();
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
    }, []);

    const getStatusColor = (bill: Bill) => {
        const dueDate = parseISO(bill.due_date);

        if (bill.status === 'paid') return '#4CAF50';
        if (bill.status === 'overdue' || isPast(dueDate)) return '#F44336';
        if (isToday(dueDate)) return '#FF9800';
        if (isTomorrow(dueDate)) return '#FFC107';
        return '#2196F3';
    };

    const getDueDateText = (dueDate: string) => {
        const date = parseISO(dueDate);

        if (isToday(date)) return 'Due Today';
        if (isTomorrow(date)) return 'Due Tomorrow';
        if (isPast(date)) return 'Overdue';
        return `Due ${format(date, 'MMM dd')}`;
    };

    const getCategoryIcon = (category: string) => {
        const icons: any = {
            utilities: 'flash',
            subscriptions: 'tv',
            insurance: 'shield-checkmark',
            rent: 'home',
            loans: 'card',
            credit_card: 'card-outline',
            other: 'ellipsis-horizontal-circle',
        };
        return icons[category] || 'document';
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
            fetchUpcomingBills();

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
                        style={styles.markPaidGradient}
                    >
                        <Ionicons name="checkmark-circle" size={28} color="white" />
                        <Text style={styles.swipeActionText}>Mark Paid</Text>
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
                    style={styles.editButton}
                    onPress={() => router.push(`/bill/${bill.id}`)}
                >
                    <LinearGradient
                        colors={Colors.gradient.blue}
                        style={styles.editButtonGradient}
                    >
                        <Ionicons name="create-outline" size={28} color="white" />
                        <Text style={styles.swipeActionText}>Edit</Text>
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
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                    style={styles.billCardGradient}
                >
                    <View style={styles.billCardInner}>
                        <View style={styles.billCardLeft}>
                            <LinearGradient
                                colors={
                                    item.status === 'overdue' || isPast(parseISO(item.due_date))
                                        ? Colors.gradient.danger
                                        : isToday(parseISO(item.due_date))
                                            ? Colors.gradient.orange
                                            : Colors.gradient.primary
                                }
                                style={styles.billIcon}
                            >
                                <Ionicons name={getCategoryIcon(item.category)} size={24} color="white" />
                            </LinearGradient>

                            <View style={styles.billInfo}>
                                <Text style={styles.billName}>{item.name}</Text>
                                <View style={styles.billMeta}>
                                    <Ionicons name="calendar-outline" size={14} color={Colors.text.secondary} />
                                    <Text style={styles.billDate}>{getDueDateText(item.due_date)}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.billCardRight}>
                            <Text style={styles.billAmount}>${parseFloat(item.amount.toString()).toFixed(2)}</Text>
                            {item.auto_pay && (
                                <View style={styles.autoPayBadge}>
                                    <Ionicons name="flash" size={12} color={Colors.success} />
                                    <Text style={styles.autoPayText}>Auto</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Swipeable>
    );

    const renderHeader = () => {
        const overdueBills = bills.filter(b => b.status === 'overdue' || isPast(parseISO(b.due_date)));
        const dueTodayBills = bills.filter(b => isToday(parseISO(b.due_date)));
        const totalUpcoming = bills.reduce((sum, b) => sum + parseFloat(b.amount.toString()), 0);

        return (
            <View style={styles.header}>
                <LinearGradient
                    colors={Colors.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroSection}
                >
                    <View style={styles.heroContent}>
                        <Text style={styles.greeting}>Hello! 👋</Text>
                        <Text style={styles.subtitle}>Track your bills with ease</Text>

                        <View style={styles.totalAmountCard}>
                            <Text style={styles.totalAmountLabel}>Total Due</Text>
                            <Text style={styles.totalAmount}>${totalUpcoming.toFixed(2)}</Text>
                            <Text style={styles.totalAmountSubtext}>{bills.length} bills this month</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.statsContainer}>
                    <LinearGradient
                        colors={Colors.gradient.blue}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statCard}
                    >
                        <Ionicons name="calendar-outline" size={28} color="white" />
                        <Text style={styles.statValue}>{bills.length}</Text>
                        <Text style={styles.statLabel}>Upcoming</Text>
                    </LinearGradient>

                    <LinearGradient
                        colors={overdueBills.length > 0 ? Colors.gradient.danger : Colors.gradient.success}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statCard}
                    >
                        <Ionicons
                            name={overdueBills.length > 0 ? "alert-circle-outline" : "checkmark-circle-outline"}
                            size={28}
                            color="white"
                        />
                        <Text style={styles.statValue}>{overdueBills.length}</Text>
                        <Text style={styles.statLabel}>Overdue</Text>
                    </LinearGradient>

                    <LinearGradient
                        colors={Colors.gradient.orange}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statCard}
                    >
                        <Ionicons name="time-outline" size={28} color="white" />
                        <Text style={styles.statValue}>{dueTodayBills.length}</Text>
                        <Text style={styles.statLabel}>Due Today</Text>
                    </LinearGradient>
                </View>

                {dueTodayBills.length > 0 && (
                    <LinearGradient
                        colors={['#FF9F43', '#FDCB6E']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.urgentAlert}
                    >
                        <Ionicons name="notifications" size={24} color="white" />
                        <Text style={styles.urgentText}>
                            {dueTodayBills.length} bill{dueTodayBills.length > 1 ? 's' : ''} due today!
                        </Text>
                    </LinearGradient>
                )}

                <Text style={styles.sectionTitle}>Upcoming Bills</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <FlatList
                data={bills}
                renderItem={renderBillItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                        <Text style={styles.emptyText}>No upcoming bills!</Text>
                        <Text style={styles.emptySubtext}>Add your first bill to get started</Text>
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
        backgroundColor: Colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    listContent: {
        paddingBottom: 100,
    },
    header: {
        marginBottom: 16,
    },
    heroSection: {
        padding: 24,
        paddingTop: 48,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: -20,
    },
    heroContent: {
        alignItems: 'center',
    },
    greeting: {
        fontSize: 32,
        fontWeight: '800',
        color: 'white',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 24,
    },
    totalAmountCard: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        backdropFilter: 'blur(10px)',
    },
    totalAmountLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    totalAmount: {
        fontSize: 48,
        fontWeight: '900',
        color: 'white',
        marginBottom: 4,
    },
    totalAmountSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 32,
        marginBottom: 24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        ...Colors.shadow.md,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: 'white',
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: '600',
    },
    urgentAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 20,
        ...Colors.shadow.sm,
    },
    urgentText: {
        marginLeft: 12,
        fontSize: 15,
        color: 'white',
        fontWeight: '600',
        flex: 1,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text.primary,
        marginHorizontal: 16,
        marginBottom: 12,
        marginTop: 8,
    },
    billCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
        ...Colors.shadow.md,
    },
    billCardGradient: {
        borderRadius: 20,
    },
    billCardInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    billCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    billIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    billInfo: {
        flex: 1,
    },
    billName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 6,
    },
    billMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    billDate: {
        fontSize: 14,
        color: Colors.text.secondary,
        marginLeft: 6,
        fontWeight: '500',
    },
    billCardRight: {
        alignItems: 'flex-end',
    },
    billAmount: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.text.primary,
        marginBottom: 6,
    },
    autoPayBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 184, 148, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    autoPayText: {
        marginLeft: 4,
        fontSize: 11,
        color: Colors.success,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text.primary,
        marginTop: 24,
    },
    emptySubtext: {
        fontSize: 15,
        color: Colors.text.secondary,
        marginTop: 8,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Colors.shadow.lg,
    },
    swipeActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    markPaidButton: {
        marginRight: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    markPaidGradient: {
        width: 100,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    editButton: {
        marginLeft: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    editButtonGradient: {
        width: 100,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    swipeActionText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
    },
});

