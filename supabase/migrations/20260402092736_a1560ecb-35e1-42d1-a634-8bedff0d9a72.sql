-- Add marketplace_integrations JSONB column to vendor_settings
ALTER TABLE public.vendor_settings
ADD COLUMN IF NOT EXISTS marketplace_integrations jsonb DEFAULT '[]'::jsonb;