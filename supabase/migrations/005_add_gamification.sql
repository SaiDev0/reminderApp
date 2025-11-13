-- Create achievements enum type
CREATE TYPE achievement_type AS ENUM (
    'first_bill',
    'streak_7',
    'streak_30',
    'streak_100',
    'bills_10',
    'bills_50',
    'bills_100',
    'saved_100',
    'saved_500',
    'saved_1000',
    'category_master',
    'early_bird',
    'perfect_month',
    'budget_keeper'
);

-- Create user_stats table for gamification tracking
CREATE TABLE IF NOT EXISTS public.user_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    total_bills_paid integer DEFAULT 0,
    total_amount_paid decimal(12, 2) DEFAULT 0,
    on_time_payments integer DEFAULT 0,
    late_payments integer DEFAULT 0,
    total_saved decimal(12, 2) DEFAULT 0,
    last_payment_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_stats_pkey PRIMARY KEY (id),
    CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_stats_user_id_unique UNIQUE (user_id)
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type achievement_type NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT achievements_pkey PRIMARY KEY (id),
    CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT achievements_user_type_unique UNIQUE (user_id, type)
);

-- Enable Row Level Security
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_stats
CREATE POLICY "Users can view their own stats" ON public.user_stats
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own stats" ON public.user_stats
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stats" ON public.user_stats
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- RLS Policies for achievements
CREATE POLICY "Users can view their own achievements" ON public.achievements
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own achievements" ON public.achievements
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own achievements" ON public.achievements
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX idx_achievements_type ON public.achievements(type);

-- Trigger for updated_at
CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON public.user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update stats when a bill is marked as paid
CREATE OR REPLACE FUNCTION update_user_stats_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_bill_amount decimal(12, 2);
    v_due_date date;
    v_paid_date date;
    v_is_on_time boolean;
    v_current_stats record;
    v_days_diff integer;
BEGIN
    -- Get bill details
    SELECT user_id, amount, due_date INTO v_user_id, v_bill_amount, v_due_date
    FROM bills WHERE id = NEW.bill_id;
    
    v_paid_date := NEW.paid_date;
    v_is_on_time := v_paid_date <= v_due_date;
    
    -- Get current stats or create new record
    SELECT * INTO v_current_stats FROM user_stats WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_stats (user_id, total_bills_paid, total_amount_paid, on_time_payments, current_streak, longest_streak, last_payment_date)
        VALUES (v_user_id, 1, NEW.amount, CASE WHEN v_is_on_time THEN 1 ELSE 0 END, CASE WHEN v_is_on_time THEN 1 ELSE 0 END, CASE WHEN v_is_on_time THEN 1 ELSE 0 END, v_paid_date);
    ELSE
        -- Update streak logic
        v_days_diff := v_paid_date - v_current_stats.last_payment_date;
        
        IF v_is_on_time THEN
            -- Check if streak continues (paid within reasonable time from last payment)
            IF v_days_diff <= 35 THEN -- Allow up to 35 days between payments to maintain streak
                UPDATE user_stats SET
                    current_streak = current_streak + 1,
                    longest_streak = GREATEST(longest_streak, current_streak + 1),
                    total_bills_paid = total_bills_paid + 1,
                    total_amount_paid = total_amount_paid + NEW.amount,
                    on_time_payments = on_time_payments + 1,
                    last_payment_date = v_paid_date,
                    updated_at = now()
                WHERE user_id = v_user_id;
            ELSE
                -- Reset streak
                UPDATE user_stats SET
                    current_streak = 1,
                    longest_streak = GREATEST(longest_streak, 1),
                    total_bills_paid = total_bills_paid + 1,
                    total_amount_paid = total_amount_paid + NEW.amount,
                    on_time_payments = on_time_payments + 1,
                    last_payment_date = v_paid_date,
                    updated_at = now()
                WHERE user_id = v_user_id;
            END IF;
        ELSE
            -- Late payment - reset streak
            UPDATE user_stats SET
                current_streak = 0,
                total_bills_paid = total_bills_paid + 1,
                total_amount_paid = total_amount_paid + NEW.amount,
                late_payments = late_payments + 1,
                last_payment_date = v_paid_date,
                updated_at = now()
            WHERE user_id = v_user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on payment_history
CREATE TRIGGER trigger_update_user_stats_on_payment
    AFTER INSERT ON public.payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_payment();

-- Function to get user's achievement progress
CREATE OR REPLACE FUNCTION get_achievement_progress(p_user_id uuid)
RETURNS TABLE (
    achievement_type achievement_type,
    is_unlocked boolean,
    progress integer,
    target integer,
    title text,
    description text,
    icon text
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT * FROM user_stats WHERE user_id = p_user_id
    ),
    unlocked AS (
        SELECT type FROM achievements WHERE user_id = p_user_id
    )
    SELECT 
        'first_bill'::achievement_type,
        EXISTS(SELECT 1 FROM unlocked WHERE type = 'first_bill'),
        LEAST((SELECT total_bills_paid FROM stats), 1),
        1,
        'First Payment'::text,
        'Pay your first bill'::text,
        '🎉'::text
    UNION ALL
    SELECT 
        'streak_7'::achievement_type,
        EXISTS(SELECT 1 FROM unlocked WHERE type = 'streak_7'),
        LEAST((SELECT current_streak FROM stats), 7),
        7,
        '7 Day Streak'::text,
        'Pay 7 bills on time in a row'::text,
        '🔥'::text
    UNION ALL
    SELECT 
        'streak_30'::achievement_type,
        EXISTS(SELECT 1 FROM unlocked WHERE type = 'streak_30'),
        LEAST((SELECT longest_streak FROM stats), 30),
        30,
        '30 Day Streak'::text,
        'Maintain a 30-bill streak'::text,
        '🌟'::text
    UNION ALL
    SELECT 
        'bills_100'::achievement_type,
        EXISTS(SELECT 1 FROM unlocked WHERE type = 'bills_100'),
        LEAST((SELECT total_bills_paid FROM stats), 100),
        100,
        'Century Club'::text,
        'Pay 100 bills'::text,
        '💯'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.user_stats IS 'Tracks user statistics for gamification';
COMMENT ON TABLE public.achievements IS 'Stores unlocked achievements for users';
COMMENT ON FUNCTION update_user_stats_on_payment IS 'Automatically updates user stats when a bill is paid';
COMMENT ON FUNCTION get_achievement_progress IS 'Returns achievement progress for a user';

