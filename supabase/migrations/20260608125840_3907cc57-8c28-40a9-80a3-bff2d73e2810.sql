
CREATE POLICY "Vendors manage own deliverable files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'deliverables'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
