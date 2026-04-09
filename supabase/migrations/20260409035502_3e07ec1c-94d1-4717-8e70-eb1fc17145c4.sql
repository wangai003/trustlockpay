
-- Milestone Agreements table for pre-escrow negotiation
CREATE TABLE public.milestone_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  proposed_by UUID NOT NULL,
  proposer_role TEXT NOT NULL CHECK (proposer_role IN ('buyer', 'vendor')),
  status TEXT NOT NULL DEFAULT 'drafting' CHECK (status IN ('drafting', 'proposed', 'agreed', 'amended')),
  version INTEGER NOT NULL DEFAULT 1,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_notes TEXT,
  locked_by_buyer BOOLEAN NOT NULL DEFAULT false,
  locked_by_vendor BOOLEAN NOT NULL DEFAULT false,
  agreed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by transaction
CREATE INDEX idx_milestone_agreements_tx ON public.milestone_agreements(transaction_id);

-- Enable RLS
ALTER TABLE public.milestone_agreements ENABLE ROW LEVEL SECURITY;

-- Buyers and vendors can view their own transaction agreements
CREATE POLICY "Users can view own transaction agreements"
  ON public.milestone_agreements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = milestone_agreements.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
  );

-- Buyers and vendors can create agreements for their transactions
CREATE POLICY "Users can create agreements for own transactions"
  ON public.milestone_agreements FOR INSERT TO authenticated
  WITH CHECK (
    proposed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = milestone_agreements.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
  );

-- Buyers and vendors can update agreements for their transactions
CREATE POLICY "Users can update own transaction agreements"
  ON public.milestone_agreements FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = milestone_agreements.transaction_id
        AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
    )
  );

-- Auto-update timestamp trigger
CREATE TRIGGER update_milestone_agreements_updated_at
  BEFORE UPDATE ON public.milestone_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for negotiation updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestone_agreements;
