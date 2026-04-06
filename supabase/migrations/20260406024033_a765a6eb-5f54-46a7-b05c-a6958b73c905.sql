-- Add account_type to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS account_type_confirmed boolean DEFAULT false;

-- Vendor site-specific config overrides (replaces localStorage)
CREATE TABLE IF NOT EXISTS public.vendor_site_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  payment_methods text[] DEFAULT ARRAY['card', 'bank_transfer', 'mobile_money', 'crypto'],
  display_name text,
  custom_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, vendor_id)
);

ALTER TABLE public.vendor_site_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own site configs"
  ON public.vendor_site_configs FOR ALL
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

CREATE TRIGGER update_vendor_site_configs_updated_at
  BEFORE UPDATE ON public.vendor_site_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on vendor_offerings for checkout lookups
CREATE INDEX IF NOT EXISTS idx_vendor_offerings_vendor_active
  ON public.vendor_offerings (vendor_id, is_active)
  WHERE is_active = true;