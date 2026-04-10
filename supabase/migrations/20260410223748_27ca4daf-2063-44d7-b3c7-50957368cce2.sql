-- Create message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('message-attachments', 'message-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Authenticated users can read any message attachment (thread-level access enforced in app)
CREATE POLICY "Users can read message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');

-- Add attachments column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT NULL;