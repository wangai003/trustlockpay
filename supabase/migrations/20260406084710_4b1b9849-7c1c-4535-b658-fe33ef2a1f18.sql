
-- 1. Add trade_scope to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS trade_scope text NOT NULL DEFAULT 'international';

-- 2. Add default_trade_scope to vendor_sites
ALTER TABLE public.vendor_sites
ADD COLUMN IF NOT EXISTS default_trade_scope text NOT NULL DEFAULT 'international';

-- 3. Add settlement_type and required_scope to transaction_milestones
ALTER TABLE public.transaction_milestones
ADD COLUMN IF NOT EXISTS settlement_type text NOT NULL DEFAULT 'escrow_funded',
ADD COLUMN IF NOT EXISTS required_scope text[] DEFAULT ARRAY['international'];

-- 4. Create external_fee_entries table
CREATE TABLE public.external_fee_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  milestone_index integer NOT NULL,
  fee_label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  paid_to text,
  receipt_url text,
  evidence_note text,
  logged_by uuid NOT NULL,
  logged_by_role text NOT NULL,
  verified_by_counterparty boolean DEFAULT false,
  verified_at timestamptz,
  required_scope text[] DEFAULT ARRAY['international'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_fee_entries ENABLE ROW LEVEL SECURITY;

-- Policies for external_fee_entries
CREATE POLICY "Users can view external fees for their transactions"
ON public.external_fee_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
    AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE POLICY "Users can log external fees for their transactions"
ON public.external_fee_entries
FOR INSERT
TO authenticated
WITH CHECK (
  logged_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
    AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE POLICY "Counterparty can verify external fees"
ON public.external_fee_entries
FOR UPDATE
TO authenticated
USING (
  logged_by != auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
    AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

-- Admin full access
CREATE POLICY "Admins can manage all external fees"
ON public.external_fee_entries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_external_fee_entries_updated_at
BEFORE UPDATE ON public.external_fee_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_external_fee_entries_transaction ON public.external_fee_entries(transaction_id);
CREATE INDEX idx_external_fee_entries_milestone ON public.external_fee_entries(transaction_id, milestone_index);
