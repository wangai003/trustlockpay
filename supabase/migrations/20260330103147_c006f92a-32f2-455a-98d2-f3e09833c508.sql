
-- ══════════════════════════════════════════════════════════════
-- SECURITY HARDENING MIGRATION
-- Fixes: public data exposure, overly permissive INSERT policies,
--        mutable search_path, missing RLS on admin_accounts
-- ══════════════════════════════════════════════════════════════

-- ─── 1. FIX: admin_accounts — RLS enabled but no policies ───
CREATE POLICY "Only service role manages admin accounts"
ON public.admin_accounts FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ─── 2. FIX: validate_profile_status — mutable search_path ───
CREATE OR REPLACE FUNCTION public.validate_profile_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'paused', 'deleted') THEN
    RAISE EXCEPTION 'Invalid profile status: %. Must be active, paused, or deleted.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 3. FIX: Remove dangerous public/anon SELECT policies ───

-- seed_tokens: remove anon read (exposes active tokens)
DROP POLICY IF EXISTS "Anon can read seed tokens" ON public.seed_tokens;

-- audit_sessions: replace blanket anon read with token-scoped
DROP POLICY IF EXISTS "Anon read audit sessions by token" ON public.audit_sessions;
CREATE POLICY "Anon read audit sessions by token scoped"
ON public.audit_sessions FOR SELECT TO anon
USING (
  access_token = current_setting('request.headers', true)::json->>'x-audit-token'
);

-- transactions: restrict to parties + admins
DROP POLICY IF EXISTS "Public read transactions" ON public.transactions;
CREATE POLICY "Parties read own transactions"
ON public.transactions FOR SELECT TO authenticated
USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- disputes: restrict to parties + admins
DROP POLICY IF EXISTS "Public read disputes" ON public.disputes;
CREATE POLICY "Parties read own disputes"
ON public.disputes FOR SELECT TO authenticated
USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- os_payments: restrict to owner + admins
DROP POLICY IF EXISTS "Public read os_payments" ON public.os_payments;
CREATE POLICY "Users read own os_payments"
ON public.os_payments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- payout_requests: remove anon read
DROP POLICY IF EXISTS "Anon can read payout requests" ON public.payout_requests;

-- rfq_requests: remove anon, keep auth scoped
DROP POLICY IF EXISTS "Anon read rfqs by vendor" ON public.rfq_requests;

-- compliance_flags: restrict to admins only
DROP POLICY IF EXISTS "Public read compliance_flags" ON public.compliance_flags;
CREATE POLICY "Admins read compliance_flags"
ON public.compliance_flags FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- kyc_documents: restrict to owner + admins
DROP POLICY IF EXISTS "Public read kyc_documents" ON public.kyc_documents;
CREATE POLICY "Vendors read own kyc docs"
ON public.kyc_documents FOR SELECT TO authenticated
USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- kyc_queue: restrict to owner + admins
DROP POLICY IF EXISTS "Public read kyc_queue" ON public.kyc_queue;
CREATE POLICY "Vendors read own kyc queue"
ON public.kyc_queue FOR SELECT TO authenticated
USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- order_carbon_copies: restrict to parties + admins
DROP POLICY IF EXISTS "Public read order carbon copies" ON public.order_carbon_copies;
CREATE POLICY "Parties read own order carbon copies"
ON public.order_carbon_copies FOR SELECT TO authenticated
USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- payouts: restrict to vendor + admins
DROP POLICY IF EXISTS "Public read payouts" ON public.payouts;
CREATE POLICY "Vendors read own payouts"
ON public.payouts FOR SELECT TO authenticated
USING (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- archived_reports: restrict to owner + admins
DROP POLICY IF EXISTS "Public read archived_reports" ON public.archived_reports;
CREATE POLICY "Owners read own archived reports"
ON public.archived_reports FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- proforma_invoices: remove anon read (auth policy already exists)
DROP POLICY IF EXISTS "Anon read proformas" ON public.proforma_invoices;

-- dispute_evidence: restrict to parties + admins
DROP POLICY IF EXISTS "Public read evidence" ON public.dispute_evidence;
CREATE POLICY "Parties read dispute evidence"
ON public.dispute_evidence FOR SELECT TO authenticated
USING (
  uploaded_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.disputes d 
    WHERE d.id = dispute_evidence.dispute_id 
    AND (d.buyer_id = auth.uid() OR d.vendor_id = auth.uid())
  )
);

-- ─── 4. FIX: Tighten INSERT policies (WITH CHECK true → scoped) ───

-- seed_token_audit_logs: restrict to own user_id
DROP POLICY IF EXISTS "Service insert seed token audit logs" ON public.seed_token_audit_logs;
CREATE POLICY "Users insert own seed token audit logs"
ON public.seed_token_audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ai_usage: restrict to own user_id
DROP POLICY IF EXISTS "Auth insert ai usage" ON public.ai_usage;
CREATE POLICY "Users insert own ai usage"
ON public.ai_usage FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- os_payments: restrict to own user_id
DROP POLICY IF EXISTS "Auth insert os_payments" ON public.os_payments;
CREATE POLICY "Users insert own os_payments"
ON public.os_payments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- notifications: restrict to own user_id or admin
DROP POLICY IF EXISTS "Auth insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- payout_requests: restrict to own user_id
DROP POLICY IF EXISTS "Users can insert payout requests" ON public.payout_requests;
CREATE POLICY "Users insert own payout requests"
ON public.payout_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- payouts: restrict to vendor or admin
DROP POLICY IF EXISTS "Auth insert payouts" ON public.payouts;
CREATE POLICY "Auth insert own payouts"
ON public.payouts FOR INSERT TO authenticated
WITH CHECK (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- recurring_orders: restrict to parties
DROP POLICY IF EXISTS "Auth insert recurring orders" ON public.recurring_orders;
CREATE POLICY "Parties insert recurring orders"
ON public.recurring_orders FOR INSERT TO authenticated
WITH CHECK (vendor_id = auth.uid() OR buyer_id = auth.uid());

-- archived_reports: restrict to own reports
DROP POLICY IF EXISTS "Auth insert archived_reports" ON public.archived_reports;
CREATE POLICY "Users insert own archived reports"
ON public.archived_reports FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- vendor_plans: restrict to vendor or admin
DROP POLICY IF EXISTS "Auth insert vendor_plans" ON public.vendor_plans;
CREATE POLICY "Vendors insert own plans"
ON public.vendor_plans FOR INSERT TO authenticated
WITH CHECK (vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
