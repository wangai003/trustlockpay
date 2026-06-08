
-- 1. Insert Technical department (no is_active column on this table)
INSERT INTO public.admin_departments (slug, name, description, can_message_clients)
VALUES (
  'technical',
  'Technical & Engineering',
  'System health, bug triage, infrastructure, blockchain anchoring & deploys',
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  can_message_clients = EXCLUDED.can_message_clients;

-- 2. Bug reports table
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('critical','error','warning','info')),
  source text NOT NULL CHECK (source IN ('frontend','edge_function','database_trigger','cron','blockchain','manual')),
  category text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  stack_trace text,
  context jsonb DEFAULT '{}'::jsonb,
  route text,
  user_id uuid,
  user_role text,
  acknowledged_by_admin_id uuid,
  acknowledged_at timestamptz,
  resolved_by_admin_id uuid,
  resolved_at timestamptz,
  resolution_notes text,
  occurrence_count int NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON public.bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_source ON public.bug_reports(source);
CREATE INDEX IF NOT EXISTS idx_bug_reports_unresolved ON public.bug_reports(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON public.bug_reports(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all bug reports" ON public.bug_reports;
CREATE POLICY "Admins can view all bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone authenticated can insert bug reports" ON public.bug_reports;
CREATE POLICY "Anyone authenticated can insert bug reports"
ON public.bug_reports FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update bug reports" ON public.bug_reports;
CREATE POLICY "Admins can update bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_bug_reports_updated_at ON public.bug_reports;
CREATE TRIGGER trg_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. report_bug() — single intake API
CREATE OR REPLACE FUNCTION public.report_bug(
  _severity text,
  _source text,
  _category text,
  _title text,
  _message text,
  _stack_trace text DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb,
  _route text DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _user_role text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bug_id uuid;
  _existing_id uuid;
  _priority text;
BEGIN
  SELECT id INTO _existing_id
  FROM public.bug_reports
  WHERE title = _title
    AND source = _source
    AND resolved_at IS NULL
    AND last_seen_at > now() - interval '1 hour'
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.bug_reports
    SET occurrence_count = occurrence_count + 1,
        last_seen_at = now(),
        context = COALESCE(_context, context)
    WHERE id = _existing_id;
    RETURN _existing_id;
  END IF;

  INSERT INTO public.bug_reports (
    severity, source, category, title, message, stack_trace,
    context, route, user_id, user_role
  ) VALUES (
    _severity, _source, _category, _title, _message, _stack_trace,
    COALESCE(_context, '{}'::jsonb), _route, _user_id, _user_role
  )
  RETURNING id INTO _bug_id;

  _priority := CASE _severity
    WHEN 'critical' THEN 'urgent'
    WHEN 'error'    THEN 'high'
    WHEN 'warning'  THEN 'normal'
    ELSE 'low'
  END;

  PERFORM public.route_department_alert(
    'system', 'technical', 'bug_report',
    '[' || upper(_severity) || '] ' || _title,
    _message,
    _priority,
    'bug_report', _bug_id::text, NULL
  );

  IF _severity = 'critical' THEN
    PERFORM public.route_department_alert(
      'system', 'executive', 'critical_bug',
      '🚨 CRITICAL: ' || _title,
      _message,
      'urgent',
      'bug_report', _bug_id::text, NULL
    );
  END IF;

  RETURN _bug_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_bug(text,text,text,text,text,text,jsonb,text,uuid,text) TO authenticated, service_role;

-- 4. Wire status-transition trigger into Bug Sentry
CREATE OR REPLACE FUNCTION public.enforce_transaction_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    PERFORM public.report_bug(
      'error',
      'database_trigger',
      'invalid_status_transition',
      'Invalid transactions.status transition: ' || COALESCE(_old_status,'NULL') || ' → ' || _new_status,
      'Trigger rejected status change for transaction ' || COALESCE(NEW.tx_id, NEW.id::text),
      NULL,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'tx_id', NEW.tx_id,
        'from_status', _old_status,
        'to_status', _new_status,
        'is_service_role', _is_service,
        'current_user', current_user
      ),
      NULL, NULL, NULL
    );
    RAISE EXCEPTION 'Invalid status transition: % → %  (use update_transaction_status RPC)',
      COALESCE(_old_status,'NULL'), _new_status
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.transaction_status_history (
    transaction_id, from_status, to_status, changed_by, changed_at, reason
  ) VALUES (
    NEW.id, _old_status, _new_status,
    COALESCE(auth.uid(), NULL), now(),
    'auto-logged by enforce trigger'
  );

  RETURN NEW;
END;
$$;
