
-- Add file_url and generation_status columns to protection_documents
ALTER TABLE public.protection_documents 
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS generation_status text NOT NULL DEFAULT 'pending';

-- Create index for faster lookups by generation status
CREATE INDEX IF NOT EXISTS idx_protection_docs_gen_status 
ON public.protection_documents (generation_status) 
WHERE generation_status = 'pending';

-- Storage policies for protection-documents bucket (authenticated read)
CREATE POLICY "Authenticated users can read protection documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'protection-documents');

-- Service role can upload (edge function uses service role)
CREATE POLICY "Service role can upload protection documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'protection-documents');
