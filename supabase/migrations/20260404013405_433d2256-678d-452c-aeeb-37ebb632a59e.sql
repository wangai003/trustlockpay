
-- 1. Remove sensitive tables from Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sanctions_screening_logs') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.sanctions_screening_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'vendor_consent_records') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.vendor_consent_records;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pre_order_contracts') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.pre_order_contracts;
  END IF;
END $$;

-- 2. Storage: protection-documents ownership-scoped
DROP POLICY IF EXISTS "Authenticated users can upload protection documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload own protection documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'protection-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own protection documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'protection-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage: team-evidence workspace-scoped
DROP POLICY IF EXISTS "Authenticated users can upload team evidence" ON storage.objects;
CREATE POLICY "Team members can upload team evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'team-evidence' AND EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.user_id = auth.uid() AND tm.workspace_id::text = (storage.foldername(name))[1]
));

CREATE POLICY "Team members can delete team evidence"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'team-evidence' AND EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.user_id = auth.uid() AND tm.workspace_id::text = (storage.foldername(name))[1]
));

-- 3. compliance_flags: admin UPDATE and DELETE
CREATE POLICY "Admins can update compliance flags"
ON public.compliance_flags FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete compliance flags"
ON public.compliance_flags FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. kyc_queue: vendor self-submission (vendor_id is UUID)
CREATE POLICY "Vendors can submit own KYC requests"
ON public.kyc_queue FOR INSERT TO authenticated
WITH CHECK (vendor_id = auth.uid());
