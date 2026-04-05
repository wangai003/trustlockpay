
-- Table for tracking milestones completed offline before entering TrustLock
CREATE TABLE public.offline_reconciliations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  milestone_index INTEGER NOT NULL,
  milestone_name TEXT NOT NULL,
  evidence_url TEXT,
  evidence_note TEXT,
  proposed_by UUID NOT NULL,
  proposed_by_role TEXT NOT NULL DEFAULT 'vendor',
  confirmed_by_buyer BOOLEAN NOT NULL DEFAULT false,
  confirmed_by_vendor BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.offline_reconciliations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view reconciliations for their transactions
CREATE POLICY "Users can view their transaction reconciliations"
ON public.offline_reconciliations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
    AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

-- Authenticated users can propose reconciliations
CREATE POLICY "Users can propose reconciliations"
ON public.offline_reconciliations
FOR INSERT
TO authenticated
WITH CHECK (
  proposed_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
    AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

-- Users can update reconciliations they're part of (for confirming)
CREATE POLICY "Users can confirm reconciliations"
ON public.offline_reconciliations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
    AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE TRIGGER update_offline_reconciliations_updated_at
BEFORE UPDATE ON public.offline_reconciliations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
