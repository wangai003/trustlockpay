
-- Create lender_certificates table
CREATE TABLE public.lender_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '90 days'),
  download_count INTEGER NOT NULL DEFAULT 0,
  blockchain_proof_id UUID REFERENCES public.blockchain_proofs(id),
  file_url TEXT,
  generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'generated', 'failed')),
  certificate_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lender_certificates ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own certificates
CREATE POLICY "Vendors can view own certificates"
ON public.lender_certificates FOR SELECT
TO authenticated
USING (vendor_id = auth.uid());

-- Vendors can create certificates for their own transactions
CREATE POLICY "Vendors can create own certificates"
ON public.lender_certificates FOR INSERT
TO authenticated
WITH CHECK (vendor_id = auth.uid());

-- Vendors can update their own certificates (download count, regenerate)
CREATE POLICY "Vendors can update own certificates"
ON public.lender_certificates FOR UPDATE
TO authenticated
USING (vendor_id = auth.uid());

-- Public verification access (anon can read by token for verification page)
CREATE POLICY "Public can verify by token"
ON public.lender_certificates FOR SELECT
TO anon
USING (status = 'active' AND expires_at > now());

-- Service role has full access (for edge functions)
CREATE POLICY "Service role full access"
ON public.lender_certificates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Auto-update timestamps
CREATE TRIGGER update_lender_certificates_updated_at
BEFORE UPDATE ON public.lender_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast token lookups (verification page)
CREATE INDEX idx_lender_certificates_token ON public.lender_certificates(verification_token);

-- Index for vendor lookups
CREATE INDEX idx_lender_certificates_vendor ON public.lender_certificates(vendor_id);

-- Index for transaction lookups
CREATE INDEX idx_lender_certificates_transaction ON public.lender_certificates(transaction_id);

-- Auto-generate lender certificate when transaction status moves to 'locked'
CREATE OR REPLACE FUNCTION public.auto_generate_lender_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status transitions to 'locked'
  IF NEW.status = 'locked' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'locked')) THEN
    -- Only create if vendor exists and no active certificate exists for this transaction
    IF NEW.vendor_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM lender_certificates
      WHERE transaction_id = NEW.id AND status = 'active'
    ) THEN
      INSERT INTO lender_certificates (transaction_id, vendor_id, certificate_metadata)
      VALUES (
        NEW.id,
        NEW.vendor_id,
        jsonb_build_object(
          'auto_generated', true,
          'tx_id', NEW.tx_id,
          'amount', NEW.amount,
          'buyer_name', COALESCE(NEW.buyer_name, 'Unknown'),
          'buyer_email', COALESCE(NEW.buyer_email, ''),
          'vendor_name', COALESCE(NEW.vendor_name, 'Unknown'),
          'industry', NEW.industry,
          'milestones', NEW.milestones
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_lender_certificate
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_lender_certificate();
