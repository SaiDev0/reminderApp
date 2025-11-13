import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Bill, BillCategory } from '../../lib/types';
import {
    getBudgetSummary,
    setCategoryBudget,
    deleteCategoryBudget,
    getBudgetStatus,
    getBudgetColor,
    getCategoryDisplayName,
    getTotalBudget,
    getTotalSpending,
} from '../../lib/budget';
import { Colors } from '../../constants/Colors';

export default function BudgetScreen() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [budgetSummaries, setBudgetSummaries] = useState<any[]>([]);
    const [totalBudget, setTotalBudget] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<BillCategory>('utilities');
    const [budgetAmount, setBudgetAmount] = useState('');
    const [alertThreshold, setAlertThreshold] = useState('80');

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch all bills
            const { data: billsData, error } = await supabase
                .from('bills')
                .select('*')
                .order('due_date');

            if (error) throw error;

            setBills(billsData || []);

            // Get budget summaries
            const summaries = await getBudgetSummary(billsData || []);
            setBudgetSummaries(summaries);

            // Get totals
            const budget = await getTotalBudget();
            const spent = await getTotalSpending(billsData || []);
            setTotalBudget(budget);
            setTotalSpent(spent);
        } catch (error) {
            console.error('Error fetching budget data:', error);
            Alert.alert('Error', 'Failed to load budget data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBudget = async () => {
        const amount = parseFloat(budgetAmount);
        const threshold = parseInt(alertThreshold);

        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
            return;
        }

        if (isNaN(threshold) || threshold < 0 || threshold > 100) {
            Alert.alert('Invalid Threshold', 'Alert threshold must be between 0 and 100');
            return;
        }

        const success = await setCategoryBudget(selectedCategory, amount, threshold);

        if (success) {
            setShowAddModal(false);
            setBudgetAmount('');
            setAlertThreshold('80');
            fetchData();
            Alert.alert('Success', 'Budget limit set successfully');
        } else {
            Alert.alert('Error', 'Failed to set budget limit');
        }
    };

    const handleDeleteBudget = async (category: BillCategory) => {
        Alert.alert(
            'Delete Budget',
            `Remove budget limit for ${getCategoryDisplayName(category)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteCategoryBudget(category);
                        if (success) {
                            fetchData();
                            Alert.alert('Success', 'Budget limit removed');
                        } else {
                            Alert.alert('Error', 'Failed to remove budget limit');
                        }
                    },
                },
            ]
        );
    };

    const renderProgressBar = (percentage: number, status: 'safe' | 'warning' | 'danger') => {
        const color = getBudgetColor(status);
        const displayPercentage = Math.min(percentage, 100);

        return (
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${displayPercentage}%`, backgroundColor: color },
                        ]}
                    />
                </View>
                <Text style={[styles.percentageText, { color }]}>
                    {percentage}%
                </Text>
            </View>
        );
    };

    const renderBudgetCard = (summary: any) => {
        const status = getBudgetStatus(summary.spent, summary.limit);
        const color = getBudgetColor(status);

        return (
            <View key={summary.category} style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                    <View style={styles.budgetTitleRow}>
                        <Text style={styles.categoryName}>
                            {getCategoryDisplayName(summary.category)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => handleDeleteBudget(summary.category)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="trash-outline" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.budgetAmounts}>
                        <Text style={[styles.spent, { color }]}>
                            ${summary.spent.toFixed(2)}
                        </Text>
                        <Text style={styles.separator}>/</Text>
                        <Text style={styles.limit}>${summary.limit.toFixed(2)}</Text>
                    </View>
                </View>

                {renderProgressBar(summary.percentage, status)}

                <View style={styles.budgetFooter}>
                    <Text style={styles.remainingText}>
                        {summary.remaining >= 0
                            ? `$${summary.remaining.toFixed(2)} remaining`
                            : `$${Math.abs(summary.remaining).toFixed(2)} over budget`}
                    </Text>
                    <Text style={styles.billsCount}>
                        {summary.bills_count} {summary.bills_count === 1 ? 'bill' : 'bills'}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const totalPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const overallStatus = getBudgetStatus(totalSpent, totalBudget);

    return (
        <View style={styles.container}>
            <LinearGradient colors={Colors.gradient.primary} style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Budget Tracking</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Total Budget Overview */}
                <View style={styles.overviewCard}>
                    <Text style={styles.overviewTitle}>This Month</Text>
                    <View style={styles.overviewAmounts}>
                        <Text style={[styles.overviewSpent, { color: getBudgetColor(overallStatus) }]}>
                            ${totalSpent.toFixed(2)}
                        </Text>
                        <Text style={styles.overviewSeparator}>/</Text>
                        <Text style={styles.overviewLimit}>${totalBudget.toFixed(2)}</Text>
                    </View>
                    {renderProgressBar(totalPercentage, overallStatus)}
                    <Text style={styles.overviewSubtext}>
                        {totalBudget - totalSpent >= 0
                            ? `$${(totalBudget - totalSpent).toFixed(2)} left to spend`
                            : `$${Math.abs(totalBudget - totalSpent).toFixed(2)} over budget`}
                    </Text>
                </View>

                {/* Category Budgets */}
                <Text style={styles.sectionTitle}>Categories</Text>
                {budgetSummaries.length > 0 ? (
                    budgetSummaries.map(renderBudgetCard)
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="wallet-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No budget limits set</Text>
                        <Text style={styles.emptySubtext}>
                            Tap the + button to add a budget for a category
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Add Budget Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Set Budget Limit</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Category</Text>
                        <ScrollView style={styles.categoryList} horizontal showsHorizontalScrollIndicator={false}>
                            {(['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'credit_card', 'other'] as BillCategory[]).map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryChip,
                                        selectedCategory === cat && styles.categoryChipActive,
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryChipText,
                                            selectedCategory === cat && styles.categoryChipTextActive,
                                        ]}
                                    >
                                        {getCategoryDisplayName(cat)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Monthly Limit</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter amount"
                            keyboardType="decimal-pad"
                            value={budgetAmount}
                            onChangeText={setBudgetAmount}
                        />

                        <Text style={styles.label}>Alert at ({alertThreshold}%)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="80"
                            keyboardType="number-pad"
                            value={alertThreshold}
                            onChangeText={setAlertThreshold}
                        />
                        <Text style={styles.hint}>Get notified when spending reaches this percentage</Text>

                        <TouchableOpacity style={styles.saveButton} onPress={handleAddBudget}>
                            <LinearGradient colors={Colors.gradient.primary} style={styles.saveButtonGradient}>
                                <Text style={styles.saveButtonText}>Set Budget</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    addButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    overviewCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        ...Colors.shadow,
    },
    overviewTitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    overviewAmounts: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    overviewSpent: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    overviewSeparator: {
        fontSize: 24,
        color: '#999',
        marginHorizontal: 8,
    },
    overviewLimit: {
        fontSize: 24,
        color: '#999',
    },
    overviewSubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    budgetCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        ...Colors.shadow,
    },
    budgetHeader: {
        marginBottom: 12,
    },
    budgetTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    budgetAmounts: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    spent: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    separator: {
        fontSize: 18,
        color: '#999',
        marginHorizontal: 4,
    },
    limit: {
        fontSize: 18,
        color: '#999',
    },
    progressBarContainer: {
        marginBottom: 12,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    percentageText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
    },
    budgetFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    remainingText: {
        fontSize: 14,
        color: '#666',
    },
    billsCount: {
        fontSize: 14,
        color: '#999',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#999',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
    },
    categoryList: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
    },
    categoryChipText: {
        fontSize: 14,
        color: '#666',
    },
    categoryChipTextActive: {
        color: 'white',
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 8,
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginBottom: 16,
    },
    saveButton: {
        marginTop: 24,
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});

