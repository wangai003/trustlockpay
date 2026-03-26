
-- Create transaction_milestones table
CREATE TABLE public.transaction_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  required_documents text[] DEFAULT '{}',
  uploaded_documents jsonb DEFAULT '[]',
  assigned_to text,
  completed_at timestamptz,
  completed_by uuid,
  observer_id uuid,
  observer_signed boolean DEFAULT false,
  observer_signed_at timestamptz,
  is_payment_milestone boolean DEFAULT false,
  payment_amount numeric,
  payment_released boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index on transaction_id
CREATE INDEX idx_transaction_milestones_tx_id ON public.transaction_milestones(transaction_id);

-- Enable RLS
ALTER TABLE public.transaction_milestones ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can read milestones for their transactions
CREATE POLICY "Users read own transaction milestones"
ON public.transaction_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

-- UPDATE: authenticated users can update milestones assigned to them
CREATE POLICY "Assigned users update milestones"
ON public.transaction_milestones
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (
        (assigned_to = 'buyer' AND t.buyer_id = auth.uid())
        OR (assigned_to = 'vendor' AND t.vendor_id = auth.uid())
      )
  )
  OR has_role(auth.uid(), 'admin')
);

-- INSERT: authenticated users can insert milestones for their transactions
CREATE POLICY "Users insert milestones"
ON public.transaction_milestones
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

-- Service role has full access by default (bypasses RLS)

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_milestones;
