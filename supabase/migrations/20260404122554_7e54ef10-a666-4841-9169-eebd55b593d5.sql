
-- Add soft-delete and reinstatement columns to admin_accounts
ALTER TABLE public.admin_accounts
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.admin_accounts(id),
  ADD COLUMN IF NOT EXISTS reinstated_at timestamptz;

-- Function to generate a random 8-char temp password
CREATE OR REPLACE FUNCTION public.generate_temp_password()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public'
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to add a new admin account (returns the temp password in plaintext so chief can share it)
CREATE OR REPLACE FUNCTION public.add_admin_account(
  _username text,
  _name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public'
AS $$
DECLARE
  _temp_pw text;
  _hash text;
  _new_id uuid;
BEGIN
  _temp_pw := public.generate_temp_password();
  _hash := crypt(_temp_pw, gen_salt('bf'));

  INSERT INTO public.admin_accounts (username, name, temp_password_hash, is_setup, failed_attempts)
  VALUES (lower(trim(_username)), trim(_name), _hash, false, 0)
  RETURNING id INTO _new_id;

  -- Auto-assign alias via trigger (already exists)

  RETURN jsonb_build_object(
    'id', _new_id,
    'username', lower(trim(_username)),
    'name', trim(_name),
    'temp_password', _temp_pw
  );
END;
$$;
