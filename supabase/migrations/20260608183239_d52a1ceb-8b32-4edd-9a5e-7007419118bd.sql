
REVOKE SELECT (access_password_hash) ON public.arbitrator_sessions FROM anon, authenticated;
REVOKE SELECT (auditor_password_hash) ON public.audit_sessions FROM anon, authenticated;

CREATE POLICY "Admins update arbitrator rulings"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'arbitrator-rulings' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'arbitrator-rulings' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete arbitrator rulings"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'arbitrator-rulings' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Buyers read deliverable files for own transactions"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'deliverables'
  AND EXISTS (
    SELECT 1
    FROM public.transaction_deliverables td
    JOIN public.transactions t ON t.id = td.transaction_id
    WHERE t.buyer_id = auth.uid()
      AND td.released_to_buyer = true
      AND td.storage_path = storage.objects.name
  )
);
