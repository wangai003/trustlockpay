
CREATE TABLE public.transaction_observers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  observer_email text NOT NULL,
  observer_name text NOT NULL,
  observer_role text,
  invited_by uuid,
  invite_accepted boolean DEFAULT false,
  access_token text UNIQUE,
  permissions text[] DEFAULT '{view}',
  milestone_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX idx_transaction_observers_tx_id ON public.transaction_observers(transaction_id);

ALTER TABLE public.transaction_observers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transaction observers"
ON public.transaction_observers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users insert observers"
ON public.transaction_observers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users update own transaction observers"
ON public.transaction_observers
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_observers;
