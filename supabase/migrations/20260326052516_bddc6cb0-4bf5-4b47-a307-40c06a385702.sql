
CREATE OR REPLACE FUNCTION public.verify_audit_password(_session_id uuid, _password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.audit_sessions
    WHERE id = _session_id
      AND auditor_password_hash = crypt(_password, auditor_password_hash)
  );
END;
$$;
