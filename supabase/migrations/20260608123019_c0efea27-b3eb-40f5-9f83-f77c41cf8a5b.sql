CREATE OR REPLACE FUNCTION public.enforce_transaction_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old_status text;
  _new_status text;
  _is_service boolean := false;
  _claims jsonb;
BEGIN
  _new_status := NEW.status;
  _old_status := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END;

  IF TG_OP = 'UPDATE' AND _old_status IS NOT DISTINCT FROM _new_status THEN
    RETURN NEW;
  END IF;

  BEGIN
    _claims := current_setting('request.jwt.claims', true)::jsonb;
    IF _claims->>'role' = 'service_role' THEN
      _is_service := true;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  IF current_user IN ('postgres','supabase_admin','service_role') THEN
    _is_service := true;
  END IF;

  IF NOT public.is_valid_status_transition(_old_status, _new_status, _is_service) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %  (use update_transaction_status RPC)',
      COALESCE(_old_status,'NULL'), _new_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- NOTE: History logging is performed by log_transaction_status_change_trg (AFTER UPDATE).
  -- Do NOT insert here — the columns previously referenced (from_status/to_status/reason) do not exist on transaction_status_history.

  RETURN NEW;
END;
$function$;