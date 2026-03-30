
-- ══════════════════════════════════════════════════════════════
-- SECURITY HARDENING MIGRATION (Part 2) — Remaining INSERT policies
-- ══════════════════════════════════════════════════════════════

-- audit_access_logs: anon insert is intentional (audit portal is public)
-- Keep but scope to valid session_id
DROP POLICY IF EXISTS "Anon insert audit logs" ON public.audit_access_logs;
CREATE POLICY "Anon insert audit logs scoped"
ON public.audit_access_logs FOR INSERT TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.audit_sessions WHERE id = session_id AND is_active = true)
);

-- blockchain_proofs: restrict to admin
DROP POLICY IF EXISTS "Service insert proofs" ON public.blockchain_proofs;
CREATE POLICY "Admins insert proofs"
ON public.blockchain_proofs FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- crypto_support_queue: anon insert is intentional (public support form)
-- Already scoped enough — keep as is

-- dispute_evidence: restrict to parties of the dispute
DROP POLICY IF EXISTS "Auth users insert evidence" ON public.dispute_evidence;
CREATE POLICY "Parties insert dispute evidence"
ON public.dispute_evidence FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- disputes: restrict insert to parties
DROP POLICY IF EXISTS "Auth users insert disputes" ON public.disputes;
CREATE POLICY "Parties insert disputes"
ON public.disputes FOR INSERT TO authenticated
WITH CHECK (
  buyer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- order_carbon_copies: restrict to parties or admin
DROP POLICY IF EXISTS "Auth insert order carbon copies" ON public.order_carbon_copies;
CREATE POLICY "Parties insert order carbon copies"
ON public.order_carbon_copies FOR INSERT TO authenticated
WITH CHECK (
  buyer_id = auth.uid() OR vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- pre_order_contracts: restrict to parties
DROP POLICY IF EXISTS "Auth insert contracts" ON public.pre_order_contracts;
CREATE POLICY "Parties insert contracts"
ON public.pre_order_contracts FOR INSERT TO authenticated
WITH CHECK (
  buyer_id = auth.uid() OR vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- proforma_invoices: restrict to vendor or admin
DROP POLICY IF EXISTS "Auth insert proformas" ON public.proforma_invoices;
CREATE POLICY "Vendors insert proformas"
ON public.proforma_invoices FOR INSERT TO authenticated
WITH CHECK (
  vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- protection_documents: restrict to parties or admin
DROP POLICY IF EXISTS "Auth insert protection docs" ON public.protection_documents;
CREATE POLICY "Parties insert protection docs"
ON public.protection_documents FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- rfq_requests: restrict to buyer or admin
DROP POLICY IF EXISTS "Auth insert rfqs" ON public.rfq_requests;
CREATE POLICY "Buyers insert rfqs"
ON public.rfq_requests FOR INSERT TO authenticated
WITH CHECK (
  buyer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- tax_ledger: restrict to admin
DROP POLICY IF EXISTS "Service insert tax ledger" ON public.tax_ledger;
CREATE POLICY "Admins insert tax ledger"
ON public.tax_ledger FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- transactions: restrict to parties or admin
DROP POLICY IF EXISTS "Auth users insert transactions" ON public.transactions;
CREATE POLICY "Parties insert transactions"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (
  buyer_id = auth.uid() OR vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- vendor_rejections: restrict to vendor
DROP POLICY IF EXISTS "Auth insert vendor rejections" ON public.vendor_rejections;
CREATE POLICY "Vendors insert rejections"
ON public.vendor_rejections FOR INSERT TO authenticated
WITH CHECK (
  vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- vendor_widget_fees: restrict to vendor or admin
DROP POLICY IF EXISTS "Auth insert widget fees" ON public.vendor_widget_fees;
CREATE POLICY "Vendors insert widget fees"
ON public.vendor_widget_fees FOR INSERT TO authenticated
WITH CHECK (
  vendor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);
