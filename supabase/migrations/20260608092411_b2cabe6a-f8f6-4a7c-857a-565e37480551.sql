
-- 1. Extend bug_reports
ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_webhook_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bug_reports_escalation
  ON public.bug_reports (severity, acknowledged_at, created_at)
  WHERE resolved_at IS NULL;

-- 2. System health metrics table
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  metric_label text NOT NULL,
  value_numeric numeric,
  value_text text,
  status text NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'critical')),
  threshold_warn numeric,
  threshold_critical numeric,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_key_time
  ON public.system_health_metrics (metric_key, recorded_at DESC);

GRANT SELECT ON public.system_health_metrics TO authenticated;
GRANT ALL ON public.system_health_metrics TO service_role;

ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view health metrics"
  ON public.system_health_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Record a metric sample
CREATE OR REPLACE FUNCTION public.record_health_metric(
  _key text,
  _label text,
  _value_numeric numeric DEFAULT NULL,
  _value_text text DEFAULT NULL,
  _threshold_warn numeric DEFAULT NULL,
  _threshold_critical numeric DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text := 'healthy';
  _id uuid;
BEGIN
  IF _value_numeric IS NOT NULL THEN
    IF _threshold_critical IS NOT NULL AND _value_numeric >= _threshold_critical THEN
      _status := 'critical';
    ELSIF _threshold_warn IS NOT NULL AND _value_numeric >= _threshold_warn THEN
      _status := 'degraded';
    END IF;
  END IF;

  INSERT INTO public.system_health_metrics
    (metric_key, metric_label, value_numeric, value_text, status,
     threshold_warn, threshold_critical, context)
  VALUES (_key, _label, _value_numeric, _value_text, _status,
          _threshold_warn, _threshold_critical, _context)
  RETURNING id INTO _id;

  -- If critical, log as a bug too
  IF _status = 'critical' THEN
    PERFORM public.report_bug(
      'critical'::text, 'cron'::text, 'system_health',
      'Health metric breached: ' || _label,
      _label || ' = ' || COALESCE(_value_numeric::text, _value_text, 'n/a') ||
      ' (threshold ' || COALESCE(_threshold_critical::text, 'n/a') || ')',
      NULL, _context, NULL, NULL, NULL
    );
  END IF;

  RETURN _id;
END;
$$;

-- 4. Latest-per-key snapshot
CREATE OR REPLACE FUNCTION public.get_system_health_summary()
RETURNS TABLE (
  metric_key text, metric_label text, value_numeric numeric,
  value_text text, status text, threshold_warn numeric,
  threshold_critical numeric, context jsonb, recorded_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (metric_key)
    metric_key, metric_label, value_numeric, value_text, status,
    threshold_warn, threshold_critical, context, recorded_at
  FROM public.system_health_metrics
  ORDER BY metric_key, recorded_at DESC;
$$;

-- 5. Escalation function
CREATE OR REPLACE FUNCTION public.escalate_stale_bugs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bug record;
  _escalated_count integer := 0;
BEGIN
  FOR _bug IN
    SELECT id, severity, title, message, category, created_at, occurrence_count
    FROM public.bug_reports
    WHERE resolved_at IS NULL
      AND acknowledged_at IS NULL
      AND escalated_at IS NULL
      AND (
        (severity = 'critical' AND created_at < now() - interval '15 minutes')
        OR (severity = 'error' AND created_at < now() - interval '60 minutes')
      )
    LIMIT 50
  LOOP
    -- Mark escalated
    UPDATE public.bug_reports
    SET escalated_at = now(),
        escalation_level = escalation_level + 1
    WHERE id = _bug.id;

    -- Route to Executives department
    PERFORM public.route_department_alert(
      'technical',
      'executive',
      'bug_escalation',
      '🚨 ESCALATION: ' || _bug.title,
      'Bug unacknowledged by Technical team. Severity: ' || _bug.severity ||
      '. Age: ' || age(now(), _bug.created_at)::text ||
      '. Occurrences: ' || _bug.occurrence_count ||
      E'\n\n' || _bug.message,
      'high',
      'bug_report',
      _bug.id::text,
      NULL
    );

    _escalated_count := _escalated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'escalated', _escalated_count,
    'ran_at', now()
  );
END;
$$;

-- 6. Cron: run every 5 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('bug-sentry-escalate');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'bug-sentry-escalate',
  '*/5 * * * *',
  $$ SELECT public.escalate_stale_bugs(); $$
);
