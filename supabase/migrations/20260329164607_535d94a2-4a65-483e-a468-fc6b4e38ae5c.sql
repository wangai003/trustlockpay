
CREATE TABLE public.blockchain_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text NOT NULL,
  prev_hash text NOT NULL DEFAULT '0x0000000000000000000000000000000000000000000000000000000000000000',
  record_type text NOT NULL,
  tx_ref text NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  chain_status text NOT NULL DEFAULT 'queued',
  polygon_tx_hash text,
  anchored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blockchain_proofs_content_hash ON public.blockchain_proofs(content_hash);
CREATE INDEX idx_blockchain_proofs_transaction_id ON public.blockchain_proofs(transaction_id);
CREATE INDEX idx_blockchain_proofs_record_type ON public.blockchain_proofs(record_type);

ALTER TABLE public.blockchain_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all proofs"
  ON public.blockchain_proofs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Transaction parties read proofs"
  ON public.blockchain_proofs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = blockchain_proofs.transaction_id
    AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  ));

CREATE POLICY "Service insert proofs"
  ON public.blockchain_proofs FOR INSERT
  TO authenticated
  WITH CHECK (true);
