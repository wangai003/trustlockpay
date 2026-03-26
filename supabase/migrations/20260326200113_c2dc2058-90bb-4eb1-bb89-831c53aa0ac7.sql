
-- Create new buckets (kyc-documents and dispute-evidence already exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('milestone-documents', 'milestone-documents', false, 10485760,
   ARRAY['application/pdf','image/jpeg','image/jpg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('acknowledgement-forms', 'acknowledgement-forms', false, 5242880,
   ARRAY['application/pdf']),
  ('invoices', 'invoices', false, 5242880,
   ARRAY['application/pdf','image/jpeg','image/jpg','image/png'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Update existing buckets with size/type constraints
UPDATE storage.buckets SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/jpg','image/png']
WHERE id = 'kyc-documents';

UPDATE storage.buckets SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/jpg','image/png','video/mp4','video/quicktime']
WHERE id = 'dispute-evidence';

-- ─── milestone-documents RLS ───────────────────────────────
CREATE POLICY "Users upload milestone docs to own transactions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'milestone-documents'
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE POLICY "Users view milestone docs for own transactions"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'milestone-documents'
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE POLICY "Admins manage all milestone docs"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'milestone-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- ─── kyc-documents RLS ─────────────────────────────────────
-- Drop existing policies if any then recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users upload own KYC docs" ON storage.objects;
  DROP POLICY IF EXISTS "Users view own KYC docs" ON storage.objects;
  DROP POLICY IF EXISTS "Admins manage all KYC docs" ON storage.objects;
END $$;

CREATE POLICY "Users upload own KYC docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users view own KYC docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Admins manage all KYC docs"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- ─── dispute-evidence RLS ──────────────────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "Dispute parties upload evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Dispute parties view evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Admins manage all dispute evidence" ON storage.objects;
END $$;

CREATE POLICY "Dispute parties upload evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dispute-evidence'
  AND EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND (d.buyer_id = auth.uid() OR d.vendor_id = auth.uid())
  )
);

CREATE POLICY "Dispute parties view evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND (
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id::text = (storage.foldername(name))[1]
        AND (d.buyer_id = auth.uid() OR d.vendor_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Admins manage all dispute evidence"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND public.has_role(auth.uid(), 'admin')
);

-- ─── acknowledgement-forms RLS ─────────────────────────────
CREATE POLICY "Transaction parties download ack forms"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'acknowledgement-forms'
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.buyer_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE POLICY "Admins manage all ack forms"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'acknowledgement-forms'
  AND public.has_role(auth.uid(), 'admin')
);

-- ─── invoices RLS ──────────────────────────────────────────
CREATE POLICY "Vendors upload invoices"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Invoice parties view invoices"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.vendor_id::text = (storage.foldername(name))[1]
        AND t.buyer_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Admins manage all invoices"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'invoices'
  AND public.has_role(auth.uid(), 'admin')
);
