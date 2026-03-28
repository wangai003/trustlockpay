
CREATE TABLE public.seed_token_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_token_id uuid REFERENCES public.seed_tokens(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  token_value text NOT NULL,
  purpose text NOT NULL DEFAULT 'os_pay',
  action text NOT NULL DEFAULT 'created',
  target_wallet_address text,
  target_wallet_label text,
  amount numeric,
  transaction_id uuid,
  payment_id uuid,
  order_number text,
  source text DEFAULT 'os_pay',
  role text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by user and token
CREATE INDEX idx_seed_token_audit_user ON public.seed_token_audit_logs(user_id);
CREATE INDEX idx_seed_token_audit_token ON public.seed_token_audit_logs(seed_token_id);
CREATE INDEX idx_seed_token_audit_action ON public.seed_token_audit_logs(action);
CREATE INDEX idx_seed_token_audit_created ON public.seed_token_audit_logs(created_at);

-- RLS
ALTER TABLE public.seed_token_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins read seed token audit logs"
  ON public.seed_token_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System inserts (edge functions via service role)
CREATE POLICY "Service insert seed token audit logs"
  ON public.seed_token_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No updates or deletes — immutable audit trail
