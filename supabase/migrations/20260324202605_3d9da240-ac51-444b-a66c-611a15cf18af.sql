
-- Seed tokens table: randomized tokens linked to user IDs for Azix wallet operations
CREATE TABLE public.seed_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  wallet_public_key text DEFAULT '0x7A3b...F92d',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seed_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seed tokens" ON public.seed_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own seed tokens" ON public.seed_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can read seed tokens" ON public.seed_tokens
  FOR SELECT TO anon USING (true);

CREATE POLICY "Admins can view all seed tokens" ON public.seed_tokens
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Payout requests table: tracks full payout lifecycle
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  seed_token text,
  role text,
  payout_type text DEFAULT 'release',
  transaction_id uuid REFERENCES public.transactions(id),
  order_number text,
  amount numeric NOT NULL,
  fee numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  payment_category text,
  payment_provider text,
  provider_details jsonb DEFAULT '{}'::jsonb,
  mode text DEFAULT 'local',
  status text DEFAULT 'pending',
  confirmation_code text,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout requests" ON public.payout_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert payout requests" ON public.payout_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own payout requests" ON public.payout_requests
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anon can read payout requests" ON public.payout_requests
  FOR SELECT TO anon USING (true);

CREATE POLICY "Admins can view all payout requests" ON public.payout_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Order carbon copies: immutable audit trail
CREATE TABLE public.order_carbon_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id),
  order_number text,
  buyer_name text,
  vendor_name text,
  item text,
  amount numeric,
  fee numeric,
  status text DEFAULT 'inactive',
  confirmation_code text,
  buyer_id uuid,
  vendor_id uuid,
  checkout_details jsonb DEFAULT '{}'::jsonb,
  admin_activated boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_carbon_copies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read order carbon copies" ON public.order_carbon_copies
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Auth insert order carbon copies" ON public.order_carbon_copies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin manage order carbon copies" ON public.order_carbon_copies
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner update order carbon copies" ON public.order_carbon_copies
  FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR vendor_id = auth.uid());
