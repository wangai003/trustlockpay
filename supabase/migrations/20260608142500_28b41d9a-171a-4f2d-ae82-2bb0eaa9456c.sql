CREATE POLICY "Counterparty can review extensions"
ON public.escrow_extensions
FOR UPDATE
USING (
  requested_by <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = escrow_extensions.transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
)
WITH CHECK (
  requested_by <> auth.uid()
  AND status IN ('approved','rejected')
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = escrow_extensions.transaction_id
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);