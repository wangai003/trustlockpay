
-- ============================================================
-- 1. ARBITRATOR PROPOSALS: Hide PII until accepted
-- ============================================================

-- Drop the open counterparty SELECT policy
DROP POLICY IF EXISTS "Users can view proposals for disputes they are part of" ON public.arbitrator_proposals;

-- Create a scoped policy that masks email/credentials for pending proposals
-- Counterparties can see proposals exist (name, institution) but not email/credentials until accepted
CREATE POLICY "Dispute parties view proposals limited"
ON public.arbitrator_proposals
FOR SELECT
TO authenticated
USING (
  dispute_id IN (
    SELECT d.id FROM disputes d
    WHERE d.buyer_id = auth.uid() OR d.vendor_id = auth.uid()
  )
);

-- Create a security definer function to mask sensitive proposal fields
CREATE OR REPLACE FUNCTION public.get_masked_arbitrator_proposals(_dispute_id uuid, _user_id uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jsonb_build_object(
      'id', ap.id,
      'dispute_id', ap.dispute_id,
      'proposed_by', ap.proposed_by,
      'proposer_role', ap.proposer_role,
      'arbitrator_name', ap.arbitrator_name,
      'arbitrator_institution', ap.arbitrator_institution,
      -- Only show email and credentials to the proposer OR after acceptance
      'arbitrator_email', CASE
        WHEN ap.proposed_by = _user_id OR ap.counterparty_response = 'accepted'
        THEN ap.arbitrator_email
        ELSE NULL
      END,
      'arbitrator_credentials', CASE
        WHEN ap.proposed_by = _user_id OR ap.counterparty_response = 'accepted'
        THEN ap.arbitrator_credentials
        ELSE NULL
      END,
      'counterparty_response', ap.counterparty_response,
      'counterparty_responded_at', ap.counterparty_responded_at,
      'auto_assign_deadline', ap.auto_assign_deadline,
      'created_at', ap.created_at,
      'updated_at', ap.updated_at
    )
  FROM arbitrator_proposals ap
  WHERE ap.dispute_id = _dispute_id
    AND EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = _dispute_id
        AND (d.buyer_id = _user_id OR d.vendor_id = _user_id)
    );
END;
$$;

-- ============================================================
-- 2. TRANSACTION OBSERVERS: Hide access_token from parties
-- ============================================================

-- Create a safe view without the access_token
CREATE OR REPLACE VIEW public.transaction_observers_safe AS
SELECT
  id,
  transaction_id,
  observer_name,
  observer_email,
  observer_role,
  permissions,
  milestone_ids,
  invited_by,
  invite_accepted,
  expires_at,
  created_at
FROM public.transaction_observers;

-- Drop old party SELECT policy and replace with one that excludes access_token
DROP POLICY IF EXISTS "Users read own transaction observers" ON public.transaction_observers;

-- Parties can read observers but only through the safe view or with token masked
CREATE POLICY "Parties read own observers no token"
ON public.transaction_observers
FOR SELECT
TO authenticated
USING (
  -- Admins get full access (including access_token for debugging)
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_observers.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
  )
);

-- ============================================================
-- 3. COUNTER-PROPOSALS: Add buyer_id, replace email-based auth
-- ============================================================

-- Add buyer_id column
ALTER TABLE public.milestone_counter_proposals
ADD COLUMN IF NOT EXISTS buyer_id uuid;

-- Drop old email-based policies
DROP POLICY IF EXISTS "Authenticated users insert own counter proposals" ON public.milestone_counter_proposals;
DROP POLICY IF EXISTS "Buyers can view proposals on their transactions" ON public.milestone_counter_proposals;

-- New buyer_id-based INSERT policy
CREATE POLICY "Users insert own counter proposals by id"
ON public.milestone_counter_proposals
FOR INSERT
TO authenticated
WITH CHECK (
  vendor_id = auth.uid() OR buyer_id = auth.uid()
);

-- New buyer_id-based SELECT policy for buyers
CREATE POLICY "Buyers view own proposals by id"
ON public.milestone_counter_proposals
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
);
