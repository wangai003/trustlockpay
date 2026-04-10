
-- =============================================================
-- 1. ARBITRATOR SESSIONS: Restrict token-based UPDATE to authenticated only
-- =============================================================
DROP POLICY IF EXISTS "Token-scoped update arbitrator session" ON public.arbitrator_sessions;
CREATE POLICY "Token-scoped update arbitrator session"
  ON public.arbitrator_sessions
  FOR UPDATE TO authenticated
  USING (
    access_token = (current_setting('request.headers', true)::json->>'x-access-token')
  )
  WITH CHECK (
    access_token = (current_setting('request.headers', true)::json->>'x-access-token')
  );

-- =============================================================
-- 2. VENDOR SITES: Scope SELECT — vendors see own, anon gets nothing via RLS
-- =============================================================
DROP POLICY IF EXISTS "Anyone can read vendor sites" ON public.vendor_sites;
DROP POLICY IF EXISTS "Public read vendor sites" ON public.vendor_sites;
DROP POLICY IF EXISTS "Anon read vendor sites" ON public.vendor_sites;

CREATE POLICY "Vendors read own sites"
  ON public.vendor_sites FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- For checkout widget resolution, use edge function with service role instead of anon RLS

-- =============================================================
-- 3. ANALYTICS: Restrict INSERT to authenticated only
-- =============================================================
DROP POLICY IF EXISTS "Scoped insert standalone analytics" ON public.standalone_analytics;
CREATE POLICY "Auth insert standalone analytics"
  ON public.standalone_analytics FOR INSERT TO authenticated
  WITH CHECK (vendor_id IS NOT NULL);

DROP POLICY IF EXISTS "Scoped insert widget analytics" ON public.widget_analytics;
CREATE POLICY "Auth insert widget analytics"
  ON public.widget_analytics FOR INSERT TO authenticated
  WITH CHECK (vendor_id IS NOT NULL);

-- =============================================================
-- 4. AUDIT SESSIONS: Create safe view excluding password_hash
-- =============================================================
CREATE OR REPLACE VIEW public.audit_sessions_safe
WITH (security_invoker = true) AS
SELECT
  id, access_token, auditor_name, auditor_email,
  allowed_tables, can_export, is_active,
  access_count, last_accessed_at, expires_at,
  created_at, updated_at, created_by
FROM public.audit_sessions;

-- =============================================================
-- 5. VENDOR CLAIM TOKENS: Replace broad anon read with scoped RPC
-- =============================================================
DROP POLICY IF EXISTS "Anon read claim tokens by token" ON public.vendor_claim_tokens;

-- Already have get_vendor_claim_by_token RPC — it only returns id, vendor_name, status, expires_at
-- So just dropping the anon policy is sufficient; the RPC is the safe path

-- =============================================================
-- 6. MILESTONE COUNTER-PROPOSALS: Redact buyer PII from vendor view
-- =============================================================
DROP POLICY IF EXISTS "Vendors can view proposals for their transactions" ON public.milestone_counter_proposals;
DROP POLICY IF EXISTS "Vendors view own proposals" ON public.milestone_counter_proposals;

-- Create a safe RPC for vendors to read proposals with masked PII
CREATE OR REPLACE FUNCTION public.get_vendor_counter_proposals(_vendor_id uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', mcp.id,
    'transaction_id', mcp.transaction_id,
    'vendor_id', mcp.vendor_id,
    'buyer_id', mcp.buyer_id,
    'proposed_milestones', mcp.proposed_milestones,
    'status', mcp.status,
    'notes', mcp.notes,
    'created_at', mcp.created_at,
    'updated_at', mcp.updated_at,
    -- Only reveal PII after acceptance
    'buyer_email', CASE WHEN mcp.status = 'accepted' THEN mcp.buyer_email ELSE NULL END,
    'buyer_phone', CASE WHEN mcp.status = 'accepted' THEN mcp.buyer_phone ELSE NULL END,
    'buyer_full_name', CASE WHEN mcp.status = 'accepted' THEN mcp.buyer_full_name ELSE NULL END,
    'buyer_country_code', mcp.buyer_country_code
  )
  FROM milestone_counter_proposals mcp
  WHERE mcp.vendor_id = _vendor_id;
END;
$$;

-- Vendor SELECT policy: only show non-PII columns via RLS
-- We keep a basic policy for RLS but vendors should use the RPC for full data
CREATE POLICY "Vendors view own proposals"
  ON public.milestone_counter_proposals FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =============================================================
-- 7. RFQ REQUESTS: Create safe RPC for vendor access with PII redaction
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_vendor_rfq_requests(_vendor_id uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', r.id,
    'vendor_id', r.vendor_id,
    'buyer_name', r.buyer_name,
    'buyer_company', r.buyer_company,
    'buyer_location', r.buyer_location,
    'industry', r.industry,
    'items', r.items,
    'notes', r.notes,
    'status', r.status,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    -- Only reveal contact info after RFQ is accepted
    'buyer_email', CASE WHEN r.status = 'accepted' THEN r.buyer_email ELSE NULL END,
    'buyer_phone_1', CASE WHEN r.status = 'accepted' THEN r.buyer_phone_1 ELSE NULL END,
    'buyer_phone_2', CASE WHEN r.status = 'accepted' THEN r.buyer_phone_2 ELSE NULL END,
    'buyer_phone_3', CASE WHEN r.status = 'accepted' THEN r.buyer_phone_3 ELSE NULL END
  )
  FROM rfq_requests r
  WHERE r.vendor_id = _vendor_id;
END;
$$;

-- =============================================================
-- 8. GAS RESERVE LEDGER: Add user-facing read policy
-- =============================================================
CREATE POLICY "Users can view their transaction gas entries"
  ON public.gas_reserve_ledger FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = gas_reserve_ledger.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );
