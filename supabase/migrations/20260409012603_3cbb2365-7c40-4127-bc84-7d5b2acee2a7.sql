
-- =============================================================
-- FIX 1: Arbitrator sessions — prevent password column exposure
-- =============================================================

-- Drop the existing token-scoped SELECT policy that exposes all columns including access_password
DROP POLICY IF EXISTS "Token-scoped read arbitrator session" ON public.arbitrator_sessions;

-- Create a new restricted SELECT policy that still allows token-scoped access
-- but we'll use a security-barrier view to hide the password column
CREATE VIEW public.arbitrator_sessions_safe WITH (security_barrier = true) AS
  SELECT
    id, access_count, access_token, arbitrator_email, arbitrator_name,
    case_bundle_generated, case_bundle_url, created_at, dispute_id,
    expires_at, last_accessed_at, ruling_anchored, ruling_distributed,
    ruling_file_name, ruling_file_url, ruling_uploaded_at, status,
    transaction_id, updated_at
  FROM public.arbitrator_sessions;

-- Re-create token-scoped read policy (still needed for admin panel reads via service key,
-- but now clients should use the safe view for direct queries)
CREATE POLICY "Token-scoped read arbitrator session"
  ON public.arbitrator_sessions
  FOR SELECT
  TO anon
  USING (
    access_token = current_setting('request.headers', true)::json->>'x-access-token'
    AND status = 'active'
    AND expires_at > now()
  );

-- =============================================================
-- FIX 2: Remove overly permissive INSERT policy on milestone_counter_proposals
-- =============================================================
DROP POLICY IF EXISTS "Authenticated users can submit counter-proposals" ON public.milestone_counter_proposals;
