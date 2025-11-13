import { supabase } from './supabase';
import { CategoryBudget, BudgetSummary, BillCategory, Bill } from './types';
import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * Get all budget limits for the current user
 */
export async function getCategoryBudgets(): Promise<CategoryBudget[]> {
    try {
        const { data, error } = await supabase
            .from('category_budgets')
            .select('*')
            .order('category');

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error fetching category budgets:', error);
        return [];
    }
}

/**
 * Set or update budget for a category
 */
export async function setCategoryBudget(
    category: BillCategory,
    monthlyLimit: number,
    alertThreshold: number = 80
): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('category_budgets')
            .upsert({
                user_id: user.id,
                category,
                monthly_limit: monthlyLimit,
                alert_threshold: alertThreshold,
            }, {
                onConflict: 'user_id,category',
            });

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error setting category budget:', error);
        return false;
    }
}

/**
 * Delete budget for a category
 */
export async function deleteCategoryBudget(category: BillCategory): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('category_budgets')
            .delete()
            .eq('user_id', user.id)
            .eq('category', category);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error deleting category budget:', error);
        return false;
    }
}

/**
 * Calculate spending for a category in the current month
 */
export async function getCategorySpending(
    category: BillCategory,
    bills: Bill[]
): Promise<number> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const spending = bills
        .filter(bill => {
            const dueDate = new Date(bill.due_date);
            return bill.category === category &&
                dueDate >= monthStart &&
                dueDate <= monthEnd;
        })
        .reduce((sum, bill) => sum + bill.amount, 0);

    return spending;
}

/**
 * Get budget summary for all categories
 */
export async function getBudgetSummary(bills: Bill[]): Promise<BudgetSummary[]> {
    try {
        const budgets = await getCategoryBudgets();

        const summaries: BudgetSummary[] = await Promise.all(
            budgets.map(async (budget) => {
                const spent = await getCategorySpending(budget.category, bills);
                const percentage = budget.monthly_limit > 0
                    ? Math.round((spent / budget.monthly_limit) * 100)
                    : 0;
                const remaining = budget.monthly_limit - spent;
                const bills_count = bills.filter(b => b.category === budget.category).length;

                return {
                    category: budget.category,
                    spent,
                    limit: budget.monthly_limit,
                    percentage,
                    remaining,
                    bills_count,
                };
            })
        );

        // Sort by percentage (highest first)
        return summaries.sort((a, b) => b.percentage - a.percentage);
    } catch (error) {
        console.error('Error getting budget summary:', error);
        return [];
    }
}

/**
 * Get status of a budget (safe, warning, danger)
 */
export function getBudgetStatus(
    spent: number,
    limit: number,
    alertThreshold: number = 80
): 'safe' | 'warning' | 'danger' {
    const percentage = (spent / limit) * 100;

    if (percentage >= 100) return 'danger';
    if (percentage >= alertThreshold) return 'warning';
    return 'safe';
}

/**
 * Get color for budget status
 */
export function getBudgetColor(status: 'safe' | 'warning' | 'danger'): string {
    switch (status) {
        case 'safe':
            return '#4CAF50';
        case 'warning':
            return '#FF9800';
        case 'danger':
            return '#F44336';
    }
}

/**
 * Get formatted category name
 */
export function getCategoryDisplayName(category: BillCategory): string {
    const names: Record<BillCategory, string> = {
        utilities: 'Utilities',
        subscriptions: 'Subscriptions',
        insurance: 'Insurance',
        rent: 'Rent',
        loans: 'Loans',
        credit_card: 'Credit Card',
        other: 'Other',
    };
    return names[category] || category;
}

/**
 * Check if user is over budget in any category
 */
export async function getOverBudgetCategories(bills: Bill[]): Promise<string[]> {
    const summaries = await getBudgetSummary(bills);
    return summaries
        .filter(summary => summary.spent > summary.limit)
        .map(summary => getCategoryDisplayName(summary.category));
}

/**
 * Calculate total budget across all categories
 */
export async function getTotalBudget(): Promise<number> {
    const budgets = await getCategoryBudgets();
    return budgets.reduce((sum, budget) => sum + budget.monthly_limit, 0);
}

/**
 * Calculate total spending across all categories
 */
export async function getTotalSpending(bills: Bill[]): Promise<number> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return bills
        .filter(bill => {
            const dueDate = new Date(bill.due_date);
            return dueDate >= monthStart && dueDate <= monthEnd;
        })
        .reduce((sum, bill) => sum + bill.amount, 0);
}

