
CREATE TABLE public.acknowledgement_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  milestone_id uuid REFERENCES public.transaction_milestones(id) ON DELETE SET NULL,
  form_type text NOT NULL,
  title text NOT NULL,
  signed_by_buyer boolean DEFAULT false,
  signed_by_vendor boolean DEFAULT false,
  buyer_signature_at timestamptz,
  vendor_signature_at timestamptz,
  buyer_ip text,
  vendor_ip text,
  terms_text text,
  pdf_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acknowledgement_forms_tx_id ON public.acknowledgement_forms(transaction_id);

ALTER TABLE public.acknowledgement_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own acknowledgement forms"
ON public.acknowledgement_forms
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users insert acknowledgement forms"
ON public.acknowledgement_forms
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users update own acknowledgement forms"
ON public.acknowledgement_forms
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.acknowledgement_forms;
