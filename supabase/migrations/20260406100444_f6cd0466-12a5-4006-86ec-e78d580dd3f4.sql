-- Add remittance fee percentage to tax_rates
ALTER TABLE public.tax_rates
ADD COLUMN remittance_fee_percentage numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tax_rates.remittance_fee_percentage IS 'Jurisdiction fee for remitting collected taxes to authorities. 0 means no remittance fee applies.';