
-- ============== testnet_onboarding ==============
CREATE TABLE public.testnet_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('vendor','buyer','lender')),
  seeded_at TIMESTAMPTZ,
  missions JSONB NOT NULL DEFAULT '{}'::jsonb,
  graduated_at TIMESTAMPTZ,
  paired_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT, INSERT, UPDATE ON public.testnet_onboarding TO authenticated;
GRANT ALL ON public.testnet_onboarding TO service_role;

ALTER TABLE public.testnet_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own onboarding"
  ON public.testnet_onboarding FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own onboarding"
  ON public.testnet_onboarding FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users insert own onboarding"
  ON public.testnet_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============== testnet_demo_counterparties ==============
CREATE TABLE public.testnet_demo_counterparties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL UNIQUE CHECK (role IN ('vendor','buyer','lender')),
  bot_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  response_delay_seconds INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.testnet_demo_counterparties TO authenticated;
GRANT ALL ON public.testnet_demo_counterparties TO service_role;

ALTER TABLE public.testnet_demo_counterparties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read demo counterparties"
  ON public.testnet_demo_counterparties FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============== testnet_clock_config ==============
CREATE TABLE public.testnet_clock_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  compression_ratio INTEGER NOT NULL DEFAULT 1440,
  enabled_for_roles TEXT[] NOT NULL DEFAULT ARRAY['vendor','buyer','lender'],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.testnet_clock_config (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT ON public.testnet_clock_config TO authenticated;
GRANT ALL ON public.testnet_clock_config TO service_role;

ALTER TABLE public.testnet_clock_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read clock config"
  ON public.testnet_clock_config FOR SELECT
  TO authenticated
  USING (true);

-- ============== Demo markers on existing tables ==============
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_testnet_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.lender_certificates
  ADD COLUMN IF NOT EXISTS is_testnet_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.escrow_extensions
  ADD COLUMN IF NOT EXISTS is_testnet_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_testnet_demo
  ON public.transactions (is_testnet_demo) WHERE is_testnet_demo = true;

-- ============== updated_at triggers ==============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_testnet_onboarding_updated_at
  BEFORE UPDATE ON public.testnet_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_testnet_demo_counterparties_updated_at
  BEFORE UPDATE ON public.testnet_demo_counterparties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== testnet_clock helper function ==============
CREATE OR REPLACE FUNCTION public.testnet_clock_effective_now(real_start TIMESTAMPTZ, network TEXT DEFAULT 'mainnet')
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ratio INTEGER;
  elapsed_seconds NUMERIC;
BEGIN
  IF network <> 'testnet' THEN
    RETURN now();
  END IF;
  SELECT compression_ratio INTO ratio FROM public.testnet_clock_config WHERE id = 1;
  IF ratio IS NULL THEN ratio := 1440; END IF;
  elapsed_seconds := EXTRACT(EPOCH FROM (now() - real_start)) * ratio;
  RETURN real_start + (elapsed_seconds || ' seconds')::interval;
END;
$$;
