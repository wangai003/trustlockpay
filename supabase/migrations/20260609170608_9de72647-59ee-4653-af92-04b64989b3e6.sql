DROP POLICY "Risk scores visible to vendor, linked lenders, admins" ON public.vendor_risk_scores;
CREATE POLICY "Risk scores visible to vendor, linked lenders, admins"
ON public.vendor_risk_scores FOR SELECT
USING (
  vendor_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM financing_applications fa
    WHERE fa.vendor_id = vendor_risk_scores.vendor_id
      AND fa.lender_id = auth.uid()
      AND fa.status = ANY (ARRAY['submitted','approved','active','funded','repaying'])
  )
);