
-- ── ARBITRATOR PROPOSALS ──
DROP POLICY IF EXISTS "Dispute parties view proposals limited" ON public.arbitrator_proposals;
-- Admins ('Admins can manage all proposals') and proposers ('Users can view own proposals') retain access.
-- Dispute parties must use public.get_masked_arbitrator_proposals which hides arbitrator_email & arbitrator_credentials.

-- ── RFQ REQUESTS ──
DROP POLICY IF EXISTS "Vendors can view their RFQs" ON public.rfq_requests;
DROP POLICY IF EXISTS "Vendors read own RFQs safe" ON public.rfq_requests;
DROP POLICY IF EXISTS "Vendors read own rfqs" ON public.rfq_requests;

CREATE POLICY "Vendors read own RFQs after acceptance"
  ON public.rfq_requests
  FOR SELECT
  TO authenticated
  USING (
    vendor_id = auth.uid()
    AND status IN ('accepted','active','completed','released','fulfilled')
  );

CREATE POLICY "Admins read all RFQs"
  ON public.rfq_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── MILESTONE COUNTER PROPOSALS ──
DROP POLICY IF EXISTS "Vendors can view their proposals" ON public.milestone_counter_proposals;
DROP POLICY IF EXISTS "Vendors view own proposals" ON public.milestone_counter_proposals;

CREATE POLICY "Vendors read own proposals after acceptance"
  ON public.milestone_counter_proposals
  FOR SELECT
  TO authenticated
  USING (
    vendor_id = auth.uid()
    AND status = 'accepted'
  );
-- 'Buyers view own proposals by id' and 'Admins can view all proposals' remain.
