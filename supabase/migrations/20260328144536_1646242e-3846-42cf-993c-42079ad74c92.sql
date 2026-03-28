
ALTER TABLE public.seed_tokens ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'os_pay';

-- Allow one active token per user per purpose
ALTER TABLE public.seed_tokens DROP CONSTRAINT IF EXISTS seed_tokens_user_purpose_unique;
ALTER TABLE public.seed_tokens ADD CONSTRAINT seed_tokens_user_purpose_unique UNIQUE (user_id, purpose, is_active);
