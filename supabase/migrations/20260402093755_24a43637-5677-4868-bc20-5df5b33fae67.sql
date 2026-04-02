CREATE TABLE public.vendor_claim_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  vendor_email text,
  vendor_name text,
  platform text NOT NULL,
  integration_id text,
  transaction_id uuid REFERENCES public.transactions(id),
  marketplace_vendor_id text,
  claimed_by uuid,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_claim_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read claim tokens by token"
  ON public.vendor_claim_tokens FOR SELECT TO anon
  USING (token = ((current_setting('request.headers', true))::json ->> 'x-claim-token'));

CREATE POLICY "Users read own claimed tokens"
  ON public.vendor_claim_tokens FOR SELECT TO authenticated
  USING (claimed_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users claim tokens"
  ON public.vendor_claim_tokens FOR UPDATE TO authenticated
  USING (status = 'pending' AND (claimed_by IS NULL OR claimed_by = auth.uid()));

CREATE POLICY "Admins manage claim tokens"
  ON public.vendor_claim_tokens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service insert claim tokens"
  ON public.vendor_claim_tokens FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_vendor_claim_tokens_token ON public.vendor_claim_tokens(token);
CREATE INDEX idx_vendor_claim_tokens_claimed_by ON public.vendor_claim_tokens(claimed_by);
CREATE INDEX idx_vendor_claim_tokens_vendor_email ON public.vendor_claim_tokens(vendor_email);