
-- Function to hash a password using bcrypt via extensions schema
CREATE OR REPLACE FUNCTION public.hash_password(_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
BEGIN
  RETURN crypt(_password, gen_salt('bf'));
END;
$$;

-- Function to verify admin password against stored hash
CREATE OR REPLACE FUNCTION public.verify_admin_password(_account_id uuid, _password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_accounts
    WHERE id = _account_id
      AND password_hash = crypt(_password, password_hash)
  );
END;
$$;

-- Function to verify temp password
CREATE OR REPLACE FUNCTION public.verify_admin_temp_password(_account_id uuid, _password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_accounts
    WHERE id = _account_id
      AND temp_password_hash = crypt(_password, temp_password_hash)
  );
END;
$$;
