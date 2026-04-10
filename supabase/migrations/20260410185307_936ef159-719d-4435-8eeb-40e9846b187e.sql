-- Add columns for approval workflow to financing_applications
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS review_started_at timestamptz;
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS reviewing_lender_id uuid;
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS decision_at timestamptz;
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS decided_by uuid;
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add columns for counter-offers
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS counter_amount numeric(12,2);
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS counter_rate_percent numeric(5,2);
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS counter_tenure_days integer;
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS counter_offered_at timestamptz;
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS counter_offered_by uuid;

-- Add approved terms columns
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS approved_amount numeric(12,2);
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS interest_rate_percent numeric(5,2);
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS approved_tenure_days integer;

-- Add visibility for marketplace vs direct targeting
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'direct'));
ALTER TABLE financing_applications ADD COLUMN IF NOT EXISTS lender_target_id uuid;

-- Add foreign key for targeted lender
ALTER TABLE financing_applications 
  ADD CONSTRAINT fk_financing_applications_lender_target 
  FOREIGN KEY (lender_target_id) REFERENCES lender_profiles(id) ON DELETE SET NULL;

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    read_at timestamptz
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can mark own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create lender_exposure table if not exists
CREATE TABLE IF NOT EXISTS lender_exposure (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_exposure numeric(15,2) DEFAULT 0,
    exposure_limit numeric(15,2) DEFAULT 1000000,
    active_facilities integer DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(lender_id)
);

-- Enable RLS on lender_exposure
ALTER TABLE lender_exposure ENABLE ROW LEVEL SECURITY;

-- Policy: Lenders can view own exposure
CREATE POLICY "Lenders can view own exposure"
  ON lender_exposure FOR SELECT
  TO authenticated
  USING (lender_id = auth.uid());

-- Create RPC function to increment lender exposure atomically
CREATE OR REPLACE FUNCTION increment_lender_exposure(
    p_lender_id uuid,
    p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO lender_exposure (lender_id, total_exposure, active_facilities)
    VALUES (p_lender_id, p_amount, 1)
    ON CONFLICT (lender_id)
    DO UPDATE SET 
        total_exposure = lender_exposure.total_exposure + p_amount,
        active_facilities = lender_exposure.active_facilities + 1,
        updated_at = now();
END;
$$;

-- Create index for faster application queries
CREATE INDEX IF NOT EXISTS idx_financing_applications_status ON financing_applications(status);
CREATE INDEX IF NOT EXISTS idx_financing_applications_lender_target ON financing_applications(lender_target_id) WHERE lender_target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financing_applications_visibility ON financing_applications(visibility);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
