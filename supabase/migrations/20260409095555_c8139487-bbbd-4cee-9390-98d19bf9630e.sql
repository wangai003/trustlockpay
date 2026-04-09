
ALTER TABLE public.vendor_document_vault
  ADD COLUMN expiry_date DATE,
  ADD COLUMN validation_status TEXT DEFAULT 'pending',
  ADD COLUMN validation_notes TEXT,
  ADD COLUMN last_validated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN flagged_reason TEXT;

CREATE INDEX idx_vendor_vault_status ON public.vendor_document_vault(validation_status);
