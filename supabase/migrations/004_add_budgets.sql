-- Create category_budgets table
CREATE TABLE IF NOT EXISTS public.category_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category bill_category NOT NULL,
    monthly_limit decimal(10, 2) NOT NULL CHECK (monthly_limit > 0),
    alert_threshold integer DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT category_budgets_pkey PRIMARY KEY (id),
    CONSTRAINT category_budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT category_budgets_user_category_unique UNIQUE (user_id, category)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their own budgets
CREATE POLICY "Allow authenticated users to view their own category budgets" ON public.category_budgets
FOR SELECT TO authenticated USING (
    user_id = auth.uid()
);

-- Policy for authenticated users to insert their own budgets
CREATE POLICY "Allow authenticated users to insert their own category budgets" ON public.category_budgets
FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
);

-- Policy for authenticated users to update their own budgets
CREATE POLICY "Allow authenticated users to update their own category budgets" ON public.category_budgets
FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
) WITH CHECK (
    user_id = auth.uid()
);

-- Policy for authenticated users to delete their own budgets
CREATE POLICY "Allow authenticated users to delete their own category budgets" ON public.category_budgets
FOR DELETE TO authenticated USING (
    user_id = auth.uid()
);

-- Create index for faster queries
CREATE INDEX idx_category_budgets_user_id ON public.category_budgets(user_id);
CREATE INDEX idx_category_budgets_category ON public.category_budgets(category);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_category_budgets_updated_at
    BEFORE UPDATE ON public.category_budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate current month spending by category
CREATE OR REPLACE FUNCTION get_monthly_spending_by_category(
    p_user_id uuid,
    p_category bill_category,
    p_month date DEFAULT CURRENT_DATE
)
RETURNS decimal AS $$
DECLARE
    total_spending decimal(10, 2);
    start_of_month date;
    end_of_month date;
BEGIN
    -- Calculate start and end of the month
    start_of_month := date_trunc('month', p_month)::date;
    end_of_month := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
    
    -- Sum all bills in the category for the month
    SELECT COALESCE(SUM(amount), 0)
    INTO total_spending
    FROM bills
    WHERE user_id = p_user_id
        AND category = p_category
        AND due_date >= start_of_month
        AND due_date <= end_of_month;
    
    RETURN total_spending;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get budget summary for all categories
CREATE OR REPLACE FUNCTION get_budget_summary(p_user_id uuid)
RETURNS TABLE (
    category bill_category,
    monthly_limit decimal(10, 2),
    current_spending decimal(10, 2),
    percentage decimal(5, 2),
    remaining decimal(10, 2),
    alert_threshold integer,
    is_over_budget boolean,
    is_near_limit boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cb.category,
        cb.monthly_limit,
        get_monthly_spending_by_category(p_user_id, cb.category) as current_spending,
        ROUND((get_monthly_spending_by_category(p_user_id, cb.category) / cb.monthly_limit * 100)::numeric, 2) as percentage,
        (cb.monthly_limit - get_monthly_spending_by_category(p_user_id, cb.category)) as remaining,
        cb.alert_threshold,
        (get_monthly_spending_by_category(p_user_id, cb.category) > cb.monthly_limit) as is_over_budget,
        ((get_monthly_spending_by_category(p_user_id, cb.category) / cb.monthly_limit * 100) >= cb.alert_threshold) as is_near_limit
    FROM category_budgets cb
    WHERE cb.user_id = p_user_id
    ORDER BY 
        CASE 
            WHEN get_monthly_spending_by_category(p_user_id, cb.category) > cb.monthly_limit THEN 1
            WHEN (get_monthly_spending_by_category(p_user_id, cb.category) / cb.monthly_limit * 100) >= cb.alert_threshold THEN 2
            ELSE 3
        END,
        percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.category_budgets IS 'Monthly budget limits for bill categories';
COMMENT ON FUNCTION get_monthly_spending_by_category IS 'Calculates total spending for a category in a given month';
COMMENT ON FUNCTION get_budget_summary IS 'Returns comprehensive budget summary with spending analysis';

