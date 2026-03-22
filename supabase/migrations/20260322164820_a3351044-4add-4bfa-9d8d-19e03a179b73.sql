
-- Admin accounts table for server-side authentication
CREATE TABLE public.admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  password_hash text,
  temp_password_hash text NOT NULL,
  is_setup boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- No RLS policies for direct access - only edge functions with service role can access
-- This ensures no client-side access to admin credentials

-- Extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert the three predefined admin accounts with hashed temp passwords
INSERT INTO public.admin_accounts (username, name, temp_password_hash) VALUES
  ('michael.tl', 'Michael', crypt('Mk7$xPq2', gen_salt('bf'))),
  ('david.tl', 'David', crypt('Dv9#nRw4', gen_salt('bf'))),
  ('emmanuel.tl', 'Emmanuel', crypt('Em3&jLs8', gen_salt('bf')));
