-- Add attachments support for bills
-- Run this after the initial migration

-- Create attachments table
CREATE TABLE IF NOT EXISTS bill_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image/jpeg', 'image/png', 'application/pdf', etc
    file_size INTEGER NOT NULL, -- in bytes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_bill_attachments_bill_id ON bill_attachments(bill_id);

-- Enable RLS
ALTER TABLE bill_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see attachments for their own bills
CREATE POLICY "Users can view their own bill attachments"
    ON bill_attachments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM bills
        WHERE bills.id = bill_attachments.bill_id
        AND bills.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own bill attachments"
    ON bill_attachments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM bills
        WHERE bills.id = bill_attachments.bill_id
        AND bills.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own bill attachments"
    ON bill_attachments FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM bills
        WHERE bills.id = bill_attachments.bill_id
        AND bills.user_id = auth.uid()
    ));

-- Create storage bucket for bill attachments
-- Note: Run this in Supabase Dashboard → Storage
-- Or via SQL if you have permissions:
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('bill-attachments', 'bill-attachments', false);

-- Storage policies
CREATE POLICY "Users can upload their own bill attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'bill-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own bill attachments"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'bill-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own bill attachments"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'bill-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
*/
