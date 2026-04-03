
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'individual';
