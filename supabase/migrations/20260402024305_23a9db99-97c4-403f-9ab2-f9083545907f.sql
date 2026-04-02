
CREATE OR REPLACE FUNCTION public.auto_freeze_on_compliance_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _new_status text;
  _buyer_count integer := 0;
  _vendor_count integer := 0;
  _total integer;
BEGIN
  IF NEW.severity NOT IN ('critical', 'high') THEN
    RETURN NEW;
  END IF;

  IF NEW.severity = 'critical' THEN
    _new_status := 'compliance_hold';
  ELSE
    _new_status := 'compliance_review';
  END IF;

  IF NEW.related_buyer_id IS NOT NULL THEN
    WITH updated AS (
      UPDATE transactions
      SET status = _new_status, updated_at = now()
      WHERE buyer_id = NEW.related_buyer_id
        AND status IN ('locked', 'shipped', 'delivered', 'pending')
      RETURNING id
    )
    SELECT count(*) INTO _buyer_count FROM updated;
  END IF;

  IF NEW.related_vendor_id IS NOT NULL THEN
    WITH updated AS (
      UPDATE transactions
      SET status = _new_status, updated_at = now()
      WHERE vendor_id = NEW.related_vendor_id
        AND status IN ('locked', 'shipped', 'delivered', 'pending')
      RETURNING id
    )
    SELECT count(*) INTO _vendor_count FROM updated;
  END IF;

  _total := _buyer_count + _vendor_count;

  IF _total > 0 THEN
    INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    SELECT ur.user_id,
           'Compliance Auto-Freeze Triggered',
           _total || ' transaction(s) moved to ' || _new_status || ' due to ' || NEW.type || ' flag (' || NEW.flag_id || '). Severity: ' || NEW.severity,
           'warning',
           'compliance_flag',
           NEW.flag_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
    LIMIT 3;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compliance_flag_auto_freeze ON compliance_flags;
CREATE TRIGGER trg_compliance_flag_auto_freeze
  AFTER INSERT ON compliance_flags
  FOR EACH ROW
  EXECUTE FUNCTION auto_freeze_on_compliance_flag();
