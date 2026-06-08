DROP POLICY IF EXISTS "Users can view own extensions" ON public.escrow_extensions;
CREATE POLICY "Transaction parties can view extensions"
ON public.escrow_extensions FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = escrow_extensions.transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);