-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE bill_frequency AS ENUM ('once', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE bill_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE bill_category AS ENUM ('utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'credit_card', 'other');
CREATE TYPE notification_type AS ENUM ('push', 'email');
CREATE TYPE notification_status AS ENUM ('sent', 'failed');

-- Bills table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    frequency bill_frequency NOT NULL DEFAULT 'monthly',
    category bill_category NOT NULL DEFAULT 'other',
    status bill_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1],
    auto_pay BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment history table
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
    paid_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminder logs table
CREATE TABLE reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
    reminder_date DATE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_type notification_type NOT NULL,
    status notification_status NOT NULL DEFAULT 'sent'
);

-- User settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    notification_time TIME DEFAULT '09:00:00',
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    expo_push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_due_date ON bills(due_date);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_payment_history_bill_id ON payment_history(bill_id);
CREATE INDEX idx_reminder_logs_bill_id ON reminder_logs(bill_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next due date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_due_date(
    current_due_date DATE,
    freq bill_frequency
)
RETURNS DATE AS $$
BEGIN
    RETURN CASE freq
        WHEN 'weekly' THEN current_due_date + INTERVAL '7 days'
        WHEN 'monthly' THEN current_due_date + INTERVAL '1 month'
        WHEN 'quarterly' THEN current_due_date + INTERVAL '3 months'
        WHEN 'yearly' THEN current_due_date + INTERVAL '1 year'
        ELSE current_due_date
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update bill status based on due date
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS void AS $$
BEGIN
    UPDATE bills
    SET status = 'overdue'
    WHERE due_date < CURRENT_DATE
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bills
CREATE POLICY "Users can view their own bills"
    ON bills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bills"
    ON bills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills"
    ON bills FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills"
    ON bills FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for payment_history
CREATE POLICY "Users can view their own payment history"
    ON payment_history FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM bills
        WHERE bills.id = payment_history.bill_id
        AND bills.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own payment history"
    ON payment_history FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM bills
        WHERE bills.id = payment_history.bill_id
        AND bills.user_id = auth.uid()
    ));

-- RLS Policies for reminder_logs
CREATE POLICY "Users can view their own reminder logs"
    ON reminder_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM bills
        WHERE bills.id = reminder_logs.bill_id
        AND bills.user_id = auth.uid()
    ));

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

