
-- Function to hash and verify arbitrator session passwords
CREATE OR REPLACE FUNCTION public.verify_arbitrator_password(_session_id uuid, _password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.arbitrator_sessions
    WHERE id = _session_id
      AND access_password = crypt(_password, access_password)
  );
END;
$$;

-- Function to hash a password for arbitrator sessions (reuses bcrypt)
CREATE OR REPLACE FUNCTION public.hash_arbitrator_password(_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public'
AS $$
BEGIN
  RETURN crypt(_password, gen_salt('bf'));
END;
$$;
