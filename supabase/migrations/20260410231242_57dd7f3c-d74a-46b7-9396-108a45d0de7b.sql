
-- Liability contracts table for lender first-login enforcement
CREATE TABLE public.liability_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID NOT NULL,
  contract_version INTEGER NOT NULL DEFAULT 1,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_text TEXT NOT NULL,
  title_position TEXT,
  ip_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lender_id, contract_version)
);

ALTER TABLE public.liability_contracts ENABLE ROW LEVEL SECURITY;

-- Lenders can view their own contracts
CREATE POLICY "Lenders can view own contracts"
  ON public.liability_contracts FOR SELECT
  TO authenticated
  USING (lender_id = auth.uid());

-- Lenders can insert their own contracts
CREATE POLICY "Lenders can sign contracts"
  ON public.liability_contracts FOR INSERT
  TO authenticated
  WITH CHECK (lender_id = auth.uid());

-- Timestamp trigger
CREATE TRIGGER update_liability_contracts_updated_at
  BEFORE UPDATE ON public.liability_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Platform config table for current contract version
CREATE TABLE public.platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read config
CREATE POLICY "Authenticated users can read config"
  ON public.platform_config FOR SELECT
  TO authenticated
  USING (true);

-- Insert current liability contract version
INSERT INTO public.platform_config (key, value)
VALUES ('liability_contract_version', '{"version": 1, "effective_date": "2026-04-10"}');
