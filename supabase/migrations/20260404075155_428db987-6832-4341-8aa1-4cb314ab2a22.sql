
-- Add self-verification columns to kyc_documents
ALTER TABLE public.kyc_documents
  ADD COLUMN IF NOT EXISTS document_category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS verification_answers jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selfie_match_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cross_field_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add verification tracking to kyc_queue
ALTER TABLE public.kyc_queue
  ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS video_call_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_call_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS video_call_notes text,
  ADD COLUMN IF NOT EXISTS cross_field_report jsonb DEFAULT '{}'::jsonb;
