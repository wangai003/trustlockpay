
CREATE TABLE public.arbitrator_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL,
  proposer_role TEXT NOT NULL CHECK (proposer_role IN ('buyer', 'vendor')),
  arbitrator_name TEXT NOT NULL,
  arbitrator_email TEXT,
  arbitrator_institution TEXT,
  arbitrator_credentials TEXT,
  counterparty_response TEXT NOT NULL DEFAULT 'pending' CHECK (counterparty_response IN ('pending', 'accepted', 'rejected')),
  counterparty_responded_at TIMESTAMPTZ,
  auto_assign_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.arbitrator_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
  ON public.arbitrator_proposals FOR SELECT TO authenticated
  USING (proposed_by = auth.uid());

CREATE POLICY "Users can view proposals for disputes they are part of"
  ON public.arbitrator_proposals FOR SELECT TO authenticated
  USING (
    dispute_id IN (
      SELECT d.id FROM public.disputes d
      WHERE d.buyer_id = auth.uid() OR d.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Users can create proposals for their disputes"
  ON public.arbitrator_proposals FOR INSERT TO authenticated
  WITH CHECK (
    proposed_by = auth.uid()
    AND dispute_id IN (
      SELECT d.id FROM public.disputes d
      WHERE d.buyer_id = auth.uid() OR d.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Counterparty can respond to proposals"
  ON public.arbitrator_proposals FOR UPDATE TO authenticated
  USING (
    proposed_by != auth.uid()
    AND dispute_id IN (
      SELECT d.id FROM public.disputes d
      WHERE d.buyer_id = auth.uid() OR d.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all proposals"
  ON public.arbitrator_proposals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_arbitrator_proposals_updated_at
  BEFORE UPDATE ON public.arbitrator_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
