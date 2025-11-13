export type BillFrequency =
    | 'once'
    | 'weekly'
    | 'bi-weekly'        // Every 2 weeks
    | 'monthly'
    | 'bi-monthly'       // Every 2 months
    | 'quarterly'        // Every 3 months
    | 'semi-annually'    // Every 6 months
    | 'yearly';

export type BillStatus = 'pending' | 'paid' | 'overdue';
export type BillCategory = 'utilities' | 'subscriptions' | 'insurance' | 'rent' | 'loans' | 'credit_card' | 'other';

export interface Bill {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    due_date: string;
    frequency: BillFrequency;
    category: BillCategory;
    status: BillStatus;
    notes?: string;
    reminder_days_before: number[];
    auto_pay: boolean;
    custom_day_of_month?: number; // For bills on specific day (1-31, or -1 for last day)
    created_at: string;
    updated_at: string;
}

export interface PaymentHistory {
    id: string;
    bill_id: string;
    paid_date: string;
    amount: number;
    notes?: string;
    created_at: string;
}

export interface ReminderLog {
    id: string;
    bill_id: string;
    reminder_date: string;
    sent_at: string;
    notification_type: 'push' | 'email';
    status: 'sent' | 'failed';
}

export interface UserSettings {
    id: string;
    user_id: string;
    email_notifications: boolean;
    push_notifications: boolean;
    notification_time: string; // HH:MM format
    currency: string;
    timezone: string;
}

export interface BillAttachment {
    id: string;
    bill_id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    created_at: string;
}

export interface CategoryBudget {
    id: string;
    user_id: string;
    category: BillCategory;
    monthly_limit: number;
    alert_threshold: number; // Percentage (e.g., 80 for 80%)
    created_at: string;
    updated_at: string;
}

export interface BudgetSummary {
    category: BillCategory;
    spent: number;
    limit: number;
    percentage: number;
    remaining: number;
    bills_count: number;
}

