ALTER TABLE public.thread_internal_notes
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT NULL;