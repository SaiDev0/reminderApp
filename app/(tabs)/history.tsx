import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { PaymentHistory } from '../../lib/types';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 16;

interface PaymentWithBill extends PaymentHistory {
    bill_name: string;
}

export default function HistoryScreen() {
    const [history, setHistory] = useState<PaymentWithBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchHistory();
        }, [])
    );

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

    const getMonthStats = () => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const thisMonthPayments = history.filter(item => {
            const paidDate = parseISO(item.paid_date);
            return paidDate >= monthStart && paidDate <= monthEnd;
        });

        const thisMonthTotal = thisMonthPayments.reduce(
            (sum, item) => sum + parseFloat(item.amount.toString()),
            0
        );

        return {
            count: thisMonthPayments.length,
            total: thisMonthTotal,
        };
    };

    const renderHistoryItem = ({ item }: { item: PaymentWithBill }) => (
        <View style={styles.historyCard}>
            <View style={styles.historyLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                </View>

                <View style={styles.historyInfo}>
                    <Text style={styles.billName}>{item.bill_name}</Text>
                    <Text style={styles.paidDate}>
                        {format(parseISO(item.paid_date), 'MMM dd, yyyy')}
                    </Text>
                </View>
            </View>

            <Text style={styles.amount}>${parseFloat(item.amount.toString()).toFixed(2)}</Text>
        </View>
    );

    const renderHeader = () => {
        const monthStats = getMonthStats();

        return (
            <>
                <LinearGradient
                    colors={Colors.gradient.emerald}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroSection}
                >
                    <Text style={styles.heroTitle}>Payment History</Text>
                    <Text style={styles.heroSubtitle}>Track all your payments</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>ALL TIME</Text>
                            <Text style={styles.statValue}>${getTotalPaid().toFixed(2)}</Text>
                            <Text style={styles.statSubtext}>{history.length} payments</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>THIS MONTH</Text>
                            <Text style={styles.statValue}>${monthStats.total.toFixed(2)}</Text>
                            <Text style={styles.statSubtext}>{monthStats.count} payments</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>Recent Payments</Text>
                </View>
            </>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
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
                        <LinearGradient
                            colors={Colors.gradient.emerald}
                            style={styles.emptyIcon}
                        >
                            <Ionicons name="receipt-outline" size={48} color="white" />
                        </LinearGradient>
                        <Text style={styles.emptyText}>No payment history</Text>
                        <Text style={styles.emptySubtext}>
                            Start paying bills to see your history here
                        </Text>
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
        </View>
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
    // Hero Section
    heroSection: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 32,
        paddingHorizontal: CARD_MARGIN,
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: 'white',
        marginBottom: 6,
    },
    heroSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 24,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 1,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        color: 'white',
        marginBottom: 4,
    },
    statSubtext: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    },
    // List Header
    listHeader: {
        paddingHorizontal: CARD_MARGIN,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    // History Cards
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: CARD_MARGIN,
        marginBottom: 12,
        ...Colors.shadow.sm,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.success + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyInfo: {
        flex: 1,
    },
    billName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    paidDate: {
        fontSize: 13,
        color: Colors.text.secondary,
        fontWeight: '500',
    },
    amount: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.success,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
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
    emptyText: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 15,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});

