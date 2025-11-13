-- Add new frequency types to the bill_frequency enum
-- PostgreSQL requires adding values one at a time

-- Add bi-weekly frequency (every 2 weeks)
ALTER TYPE bill_frequency ADD VALUE IF NOT EXISTS 'bi-weekly';

-- Add bi-monthly frequency (every 2 months)
ALTER TYPE bill_frequency ADD VALUE IF NOT EXISTS 'bi-monthly';

-- Add semi-annually frequency (every 6 months)
ALTER TYPE bill_frequency ADD VALUE IF NOT EXISTS 'semi-annually';

-- Add custom_day_of_month column to bills table if it doesn't exist
-- This allows users to specify bills due on specific days like 1st, 15th, or last day
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bills' 
        AND column_name = 'custom_day_of_month'
    ) THEN
        ALTER TABLE bills ADD COLUMN custom_day_of_month INTEGER;
        
        -- Add check constraint to ensure valid day of month (1-31, or -1 for last day)
        ALTER TABLE bills ADD CONSTRAINT check_custom_day_of_month 
        CHECK (custom_day_of_month IS NULL OR 
               (custom_day_of_month >= 1 AND custom_day_of_month <= 31) OR 
               custom_day_of_month = -1);
        
        -- Add comment for clarity
        COMMENT ON COLUMN bills.custom_day_of_month IS 'Specific day of month for recurring bills (1-31, or -1 for last day of month)';
    END IF;
END $$;

-- Drop the old calculate_next_due_date function first
DROP FUNCTION IF EXISTS calculate_next_due_date(DATE, bill_frequency);

-- Create the updated calculate_next_due_date function with new frequencies and custom day support
CREATE OR REPLACE FUNCTION calculate_next_due_date(
    current_due_date DATE,
    freq bill_frequency,
    custom_day INTEGER DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
    next_date DATE;
    target_month INTEGER;
    target_year INTEGER;
    last_day_of_month INTEGER;
BEGIN
    next_date := CASE freq
        WHEN 'weekly' THEN current_due_date + INTERVAL '7 days'
        WHEN 'bi-weekly' THEN current_due_date + INTERVAL '14 days'
        WHEN 'monthly' THEN current_due_date + INTERVAL '1 month'
        WHEN 'bi-monthly' THEN current_due_date + INTERVAL '2 months'
        WHEN 'quarterly' THEN current_due_date + INTERVAL '3 months'
        WHEN 'semi-annually' THEN current_due_date + INTERVAL '6 months'
        WHEN 'yearly' THEN current_due_date + INTERVAL '1 year'
        ELSE current_due_date
    END;
    
    -- Handle custom day of month for monthly+ frequencies
    IF custom_day IS NOT NULL AND freq IN ('monthly', 'bi-monthly', 'quarterly', 'semi-annually', 'yearly') THEN
        target_month := EXTRACT(MONTH FROM next_date);
        target_year := EXTRACT(YEAR FROM next_date);
        
        IF custom_day = -1 THEN
            -- Last day of the month
            next_date := (DATE_TRUNC('month', next_date) + INTERVAL '1 month - 1 day')::DATE;
        ELSE
            -- Specific day of month
            last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', next_date) + INTERVAL '1 month - 1 day')::DATE);
            
            -- Use the custom day or the last day of month if custom day doesn't exist
            IF custom_day <= last_day_of_month THEN
                next_date := make_date(target_year, target_month, custom_day);
            ELSE
                next_date := (DATE_TRUNC('month', next_date) + INTERVAL '1 month - 1 day')::DATE;
            END IF;
        END IF;
    END IF;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the migration
COMMENT ON FUNCTION calculate_next_due_date IS 'Calculates next due date for recurring bills with support for all frequency types and custom day of month';

