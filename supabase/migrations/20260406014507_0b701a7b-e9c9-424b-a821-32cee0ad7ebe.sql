
-- Platform API Keys table
CREATE TABLE IF NOT EXISTS public.platform_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  platform_fee_percent NUMERIC NOT NULL DEFAULT 0,
  contact_email TEXT,
  payout_account TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_api_keys' AND policyname = 'Admins can manage platform keys') THEN
    CREATE POLICY "Admins can manage platform keys"
      ON public.platform_api_keys FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE TRIGGER update_platform_api_keys_updated_at
  BEFORE UPDATE ON public.platform_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend vendor_claim_tokens
ALTER TABLE public.vendor_claim_tokens
  ADD COLUMN IF NOT EXISTS platform_id UUID REFERENCES public.platform_api_keys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS industry TEXT;

-- Add cart_id and platform_id to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS cart_id UUID,
  ADD COLUMN IF NOT EXISTS platform_id UUID REFERENCES public.platform_api_keys(id);

CREATE INDEX IF NOT EXISTS idx_transactions_cart_id ON public.transactions(cart_id);
CREATE INDEX IF NOT EXISTS idx_transactions_platform_id ON public.transactions(platform_id);
CREATE INDEX IF NOT EXISTS idx_vendor_claim_tokens_platform ON public.vendor_claim_tokens(platform_id);
