-- Add display_currency to vendor_sites
ALTER TABLE public.vendor_sites
ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'USD';

-- Add a comment for documentation
COMMENT ON COLUMN public.vendor_sites.display_currency IS 'ISO 4217 currency code for local price display (e.g. JMD, EUR, NGN). Widget shows dual USD + local pricing when set.';