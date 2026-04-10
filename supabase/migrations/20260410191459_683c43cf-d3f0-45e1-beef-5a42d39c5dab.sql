
-- Offline repayment confirmations table
CREATE TABLE public.repayment_confirmations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES public.financing_applications(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID NOT NULL,
    lender_id UUID NOT NULL,
    amount_usd NUMERIC NOT NULL,
    proof_url TEXT,
    proof_file_name TEXT,
    reference_number TEXT,
    notes TEXT,
    lender_response TEXT NOT NULL DEFAULT 'pending',
    lender_response_note TEXT,
    lender_responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.repayment_confirmations ENABLE ROW LEVEL SECURITY;

-- Vendors can create and view their own
CREATE POLICY "Vendors can create own repayment confirmations"
ON public.repayment_confirmations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can view own repayment confirmations"
ON public.repayment_confirmations FOR SELECT
TO authenticated
USING (auth.uid() = vendor_id);

-- Lenders can view and update confirmations addressed to them
CREATE POLICY "Lenders can view their repayment confirmations"
ON public.repayment_confirmations FOR SELECT
TO authenticated
USING (auth.uid() = lender_id);

CREATE POLICY "Lenders can respond to repayment confirmations"
ON public.repayment_confirmations FOR UPDATE
TO authenticated
USING (auth.uid() = lender_id);

-- Admins can view all
CREATE POLICY "Admins can view all repayment confirmations"
ON public.repayment_confirmations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp
CREATE TRIGGER update_repayment_confirmations_updated_at
BEFORE UPDATE ON public.repayment_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
