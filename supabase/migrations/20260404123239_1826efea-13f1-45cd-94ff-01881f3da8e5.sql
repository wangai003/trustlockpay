
-- Add rank to chief_admin_config (1 = original, 2+ = promoted)
ALTER TABLE public.chief_admin_config
  ADD COLUMN IF NOT EXISTS rank integer NOT NULL DEFAULT 2;

-- Set Michael as rank 1 (original chief)
UPDATE public.chief_admin_config
SET rank = 1
WHERE admin_id = (
  SELECT id FROM public.admin_accounts WHERE username = 'michael.tl' LIMIT 1
) AND is_active = true;

-- Succession function: when original chief is hard-deleted or soft-deleted,
-- promote the next chief in line
CREATE OR REPLACE FUNCTION public.handle_chief_succession()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _was_original boolean;
  _next_chief_id uuid;
BEGIN
  -- Only act on soft-delete (is_deleted toggled to true)
  IF TG_OP = 'UPDATE' AND NEW.is_deleted = true AND OLD.is_deleted = false THEN
    -- Check if this admin was rank-1 chief
    SELECT EXISTS(
      SELECT 1 FROM chief_admin_config
      WHERE admin_id = NEW.id AND is_active = true AND rank = 1
    ) INTO _was_original;

    IF _was_original THEN
      -- Deactivate their chief record
      UPDATE chief_admin_config SET is_active = false WHERE admin_id = NEW.id;

      -- Find next active chief by earliest designated_at
      SELECT admin_id INTO _next_chief_id
      FROM chief_admin_config
      WHERE is_active = true AND admin_id != NEW.id
      ORDER BY designated_at ASC
      LIMIT 1;

      IF _next_chief_id IS NOT NULL THEN
        UPDATE chief_admin_config SET rank = 1 WHERE admin_id = _next_chief_id AND is_active = true;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chief_succession
  AFTER UPDATE ON public.admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_chief_succession();
