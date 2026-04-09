
-- Rename column to clarify it stores a hash
ALTER TABLE public.arbitrator_sessions 
  RENAME COLUMN access_password TO access_password_hash;

-- Recreate verify function with updated column name
CREATE OR REPLACE FUNCTION public.verify_arbitrator_password(_session_id uuid, _password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'extensions', 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.arbitrator_sessions
    WHERE id = _session_id
      AND access_password_hash = crypt(_password, access_password_hash)
  );
END;
$function$;
