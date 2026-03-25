-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('dispute-evidence', 'dispute-evidence', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf', 'video/mp4']);

-- RLS: kyc-documents
CREATE POLICY "Users upload to own folder kyc" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own kyc files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins read all kyc files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

-- RLS: dispute-evidence
CREATE POLICY "Users upload to own folder evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dispute-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own evidence files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dispute-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins read all evidence files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dispute-evidence' AND public.has_role(auth.uid(), 'admin'));