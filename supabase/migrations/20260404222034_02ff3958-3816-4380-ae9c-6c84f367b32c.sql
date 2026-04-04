ALTER TABLE public.team_workspaces ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- Backfill existing rows
UPDATE public.team_workspaces SET invite_code = encode(gen_random_bytes(6), 'hex') WHERE invite_code IS NULL;