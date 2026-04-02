DROP POLICY "Service insert claim tokens" ON public.vendor_claim_tokens;

CREATE POLICY "Admins insert claim tokens"
  ON public.vendor_claim_tokens FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));