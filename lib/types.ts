export type BillFrequency = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
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

