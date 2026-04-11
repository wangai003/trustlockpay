-- Add missing columns to lender_disbursement_records for full analytics hub support
ALTER TABLE public.lender_disbursement_records
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot numeric,
  ADD COLUMN IF NOT EXISTS disbursement_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric;

-- Add index for lender analytics queries
CREATE INDEX IF NOT EXISTS idx_ldr_records_lender_date ON public.lender_disbursement_records (lender_id, disbursed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ldr_records_vendor ON public.lender_disbursement_records (vendor_id) WHERE vendor_id IS NOT NULL;