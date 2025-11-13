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
    Dimensions,
    Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { BillCategory, CategoryBudget, BudgetSummary } from '../../lib/types';
import {
    getCategoryBudgets,
    createCategoryBudget,
    updateCategoryBudget,
    deleteCategoryBudget,
    getBudgetSummary,
} from '../../lib/budget';
import { Colors } from '../../constants/Colors';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 16;

const allCategories: BillCategory[] = [
    'utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'credit_card', 'other'
];

export default function BudgetScreen() {
    const [loading, setLoading] = useState(true);
    const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
    const [budgetSummaries, setBudgetSummaries] = useState<BudgetSummary[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<BillCategory | null>(null);
    const [monthlyLimit, setMonthlyLimit] = useState('');
    const [alertThreshold, setAlertThreshold] = useState('80');
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchBudgetsAndSummary();
        }, [userId])
    );

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            } else {
                router.replace('/auth/login');
            }
        };
        fetchUser();
    }, []);

    const fetchBudgetsAndSummary = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const fetchedBudgets = await getCategoryBudgets(userId);
            setBudgets(fetchedBudgets);
            const fetchedSummaries = await getBudgetSummary(userId);
            setBudgetSummaries(fetchedSummaries);
        } catch (error) {
            console.error('Error fetching budgets or summary:', error);
            Alert.alert('Error', 'Failed to load budget data.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBudget = (category?: BillCategory) => {
        setEditingBudget(null);
        setSelectedCategory(category || null);
        setMonthlyLimit('');
        setAlertThreshold('80');
        setIsModalVisible(true);
    };

    const handleEditBudget = (budget: CategoryBudget) => {
        setEditingBudget(budget);
        setSelectedCategory(budget.category);
        setMonthlyLimit(budget.monthly_limit.toString());
        setAlertThreshold(budget.alert_threshold.toString());
        setIsModalVisible(true);
    };

    const handleSaveBudget = async () => {
        if (!userId || !selectedCategory || !monthlyLimit) {
            Alert.alert('Error', 'Please fill all required fields.');
            return;
        }
        const limit = parseFloat(monthlyLimit);
        const threshold = parseInt(alertThreshold);

        if (isNaN(limit) || limit <= 0) {
            Alert.alert('Error', 'Please enter a valid monthly limit.');
            return;
        }
        if (isNaN(threshold) || threshold < 0 || threshold > 100) {
            Alert.alert('Error', 'Alert threshold must be between 0 and 100.');
            return;
        }

        setSaving(true);
        try {
            if (editingBudget) {
                await updateCategoryBudget(editingBudget.id, limit, threshold);
                Alert.alert('✅ Updated', 'Budget updated successfully!');
            } else {
                await createCategoryBudget(userId, selectedCategory, limit, threshold);
                Alert.alert('✅ Added', 'Budget added successfully!');
            }
            setIsModalVisible(false);
            fetchBudgetsAndSummary();
        } catch (error: any) {
            console.error('Error saving budget:', error);
            Alert.alert('Error', error.message || 'Failed to save budget.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBudget = async (budgetId: string) => {
        Alert.alert(
            'Delete Budget',
            'Are you sure you want to delete this budget?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategoryBudget(budgetId);
                            Alert.alert('✅ Deleted', 'Budget removed');
                            fetchBudgetsAndSummary();
                        } catch (error) {
                            console.error('Error deleting budget:', error);
                            Alert.alert('Error', 'Failed to delete budget');
                        }
                    },
                },
            ]
        );
    };

    const getProgressColor = (percentage: number, threshold: number) => {
        if (percentage >= 100) return Colors.gradient.danger;
        if (percentage >= threshold) return Colors.gradient.orange;
        return Colors.gradient.success;
    };

    const getCategoryInfo = (category: BillCategory) => {
        return (Colors.category as any)[category] || Colors.category.other;
    };

    const getCategoryIcon = (category: BillCategory) => {
        const icons: Record<BillCategory, string> = {
            utilities: 'flash',
            subscriptions: 'tv',
            insurance: 'shield',
            rent: 'home',
            loans: 'wallet',
            credit_card: 'card',
            other: 'ellipsis-horizontal',
        };
        return icons[category] || 'document';
    };

    const totalSpent = budgetSummaries.reduce((sum, s) => sum + s.spent, 0);
    const totalLimit = budgetSummaries.reduce((sum, s) => sum + s.limit, 0);
    const totalRemaining = totalLimit - totalSpent;
    const totalPercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Budget Tracking</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Hero Card - Total Overview */}
                <LinearGradient
                    colors={Colors.gradient.ocean}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <Text style={styles.heroLabel}>THIS MONTH</Text>
                    <Text style={styles.heroAmount}>${totalSpent.toFixed(2)}</Text>
                    <Text style={styles.heroSubtext}>
                        of ${totalLimit.toFixed(2)} budget
                    </Text>

                    {/* Circular Progress */}
                    <View style={styles.progressCircle}>
                        <View style={[styles.progressFill, {
                            width: `${Math.min(100, totalPercentage)}%`,
                            backgroundColor: totalPercentage >= 100 ? Colors.danger :
                                totalPercentage >= 80 ? Colors.warning : Colors.success
                        }]} />
                    </View>

                    <View style={styles.heroStats}>
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatLabel}>Remaining</Text>
                            <Text style={[styles.heroStatValue, {
                                color: totalRemaining < 0 ? Colors.danger : 'white'
                            }]}>
                                ${Math.abs(totalRemaining).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatLabel}>Used</Text>
                            <Text style={styles.heroStatValue}>{Math.min(100, totalPercentage).toFixed(0)}%</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Category Budgets */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Categories</Text>
                        <TouchableOpacity
                            onPress={() => handleAddBudget()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-circle" size={28} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {allCategories.map(category => {
                        const budget = budgets.find(b => b.category === category);
                        const summary = budgetSummaries.find(s => s.category === category);
                        const spent = summary?.spent || 0;
                        const limit = budget?.monthly_limit || 0;
                        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                        const categoryInfo = getCategoryInfo(category);
                        const icon = getCategoryIcon(category);

                        return (
                            <View key={category} style={styles.budgetCard}>
                                <View style={styles.budgetHeader}>
                                    <View style={styles.budgetLeft}>
                                        <LinearGradient
                                            colors={categoryInfo.gradient}
                                            style={styles.categoryIconCard}
                                        >
                                            <Ionicons name={icon as any} size={24} color="white" />
                                        </LinearGradient>
                                        <View>
                                            <Text style={styles.categoryName}>
                                                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </Text>
                                            {budget && (
                                                <Text style={styles.categorySubtext}>
                                                    ${spent.toFixed(2)} / ${limit.toFixed(2)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {budget ? (
                                        <View style={styles.budgetActions}>
                                            <TouchableOpacity
                                                onPress={() => handleEditBudget(budget)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="create-outline" size={22} color={Colors.info} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteBudget(budget.id)}
                                                style={{ marginLeft: 12 }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="trash-outline" size={22} color={Colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => handleAddBudget(category)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.setBudgetText}>Set Budget</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {budget && (
                                    <View style={styles.progressSection}>
                                        {/* Progress Bar */}
                                        <View style={styles.progressBar}>
                                            <LinearGradient
                                                colors={getProgressColor(percentage, budget.alert_threshold)}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={[styles.progressBarFill, {
                                                    width: `${Math.min(100, percentage)}%`
                                                }]}
                                            />
                                        </View>

                                        {/* Percentage and Alert */}
                                        <View style={styles.progressInfo}>
                                            <Text style={styles.progressPercentage}>
                                                {percentage.toFixed(0)}%
                                            </Text>
                                            {percentage >= budget.alert_threshold && (
                                                <View style={styles.alertBadge}>
                                                    <Ionicons
                                                        name={percentage >= 100 ? "alert-circle" : "warning"}
                                                        size={14}
                                                        color={percentage >= 100 ? Colors.danger : Colors.warning}
                                                    />
                                                    <Text style={[styles.alertText, {
                                                        color: percentage >= 100 ? Colors.danger : Colors.warning
                                                    }]}>
                                                        {percentage >= 100 ? 'Over budget!' : 'Approaching limit'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add/Edit Budget Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingBudget ? 'Edit Budget' : 'Add Budget'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setIsModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={28} color={Colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Category Selection */}
                        <Text style={styles.inputLabel}>Category</Text>
                        <View style={styles.categoryGrid}>
                            {allCategories.map(cat => {
                                const isSelected = selectedCategory === cat;
                                const categoryInfo = getCategoryInfo(cat);
                                const icon = getCategoryIcon(cat);

                                return (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryOption,
                                            isSelected && styles.categoryOptionSelected
                                        ]}
                                        onPress={() => setSelectedCategory(cat)}
                                        activeOpacity={0.8}
                                    >
                                        {isSelected && (
                                            <LinearGradient
                                                colors={categoryInfo.gradient}
                                                style={StyleSheet.absoluteFill}
                                            />
                                        )}
                                        <Ionicons
                                            name={icon as any}
                                            size={20}
                                            color={isSelected ? 'white' : Colors.text.secondary}
                                        />
                                        <Text style={[
                                            styles.categoryOptionText,
                                            isSelected && styles.categoryOptionTextSelected
                                        ]}>
                                            {cat.replace(/_/g, ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Monthly Limit */}
                        <Text style={styles.inputLabel}>Monthly Limit ($)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="e.g., 500"
                            placeholderTextColor={Colors.text.light}
                            value={monthlyLimit}
                            onChangeText={setMonthlyLimit}
                        />

                        {/* Alert Threshold */}
                        <Text style={styles.inputLabel}>Alert at (%)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="e.g., 80"
                            placeholderTextColor={Colors.text.light}
                            value={alertThreshold}
                            onChangeText={setAlertThreshold}
                        />

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalButtonSecondary}
                                onPress={() => setIsModalVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonPrimary}
                                onPress={handleSaveBudget}
                                disabled={saving}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={Colors.gradient.primary}
                                    style={styles.modalButtonGradient}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.modalButtonText}>Save Budget</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: CARD_MARGIN,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    // Hero Card
    heroCard: {
        marginHorizontal: CARD_MARGIN,
        marginBottom: 24,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        ...Colors.shadow.lg,
    },
    heroLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    heroAmount: {
        fontSize: 48,
        fontWeight: '800',
        color: 'white',
        marginBottom: 4,
    },
    heroSubtext: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
        marginBottom: 20,
    },
    progressCircle: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    heroStats: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
    },
    heroStat: {
        alignItems: 'center',
    },
    heroStatLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    heroStatValue: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
    },
    // Section
    section: {
        paddingHorizontal: CARD_MARGIN,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    // Budget Cards
    budgetCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...Colors.shadow.sm,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    budgetLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    categoryIconCard: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 2,
        textTransform: 'capitalize',
    },
    categorySubtext: {
        fontSize: 13,
        color: Colors.text.secondary,
    },
    budgetActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    setBudgetText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    progressSection: {
        marginTop: 4,
    },
    progressBar: {
        height: 10,
        backgroundColor: Colors.background,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressPercentage: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    alertBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    alertText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 12,
        marginTop: 16,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: Colors.background,
        gap: 6,
        overflow: 'hidden',
    },
    categoryOptionSelected: {},
    categoryOptionText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.secondary,
        textTransform: 'capitalize',
    },
    categoryOptionTextSelected: {
        color: 'white',
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.text.primary,
        backgroundColor: Colors.background,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    modalButtonSecondary: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: Colors.background,
        alignItems: 'center',
    },
    modalButtonTextSecondary: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    modalButtonPrimary: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalButtonGradient: {
        padding: 16,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});

