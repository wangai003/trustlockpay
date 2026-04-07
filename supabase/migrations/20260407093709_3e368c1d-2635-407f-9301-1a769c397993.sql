
-- Cross-department coordination alerts
CREATE TABLE public.admin_cross_department_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_department TEXT NOT NULL,
  target_department TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_by_admin_id UUID REFERENCES public.admin_accounts(id),
  acknowledged_by UUID REFERENCES public.admin_accounts(id),
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  override_by UUID REFERENCES public.admin_accounts(id),
  override_at TIMESTAMPTZ,
  override_note TEXT,
  dependency_chain JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cross_dept_alerts_target ON public.admin_cross_department_alerts(target_department);
CREATE INDEX idx_cross_dept_alerts_status ON public.admin_cross_department_alerts(status);
CREATE INDEX idx_cross_dept_alerts_priority ON public.admin_cross_department_alerts(priority);

-- RLS
ALTER TABLE public.admin_cross_department_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.admin_cross_department_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER update_cross_dept_alerts_updated_at
  BEFORE UPDATE ON public.admin_cross_department_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_cross_department_alerts;

-- Helper function to route an alert and auto-create a task in the target department
CREATE OR REPLACE FUNCTION public.route_department_alert(
  _source_dept TEXT,
  _target_dept TEXT,
  _alert_type TEXT,
  _title TEXT,
  _message TEXT,
  _priority TEXT DEFAULT 'normal',
  _entity_type TEXT DEFAULT NULL,
  _entity_id TEXT DEFAULT NULL,
  _admin_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _alert_id UUID;
BEGIN
  INSERT INTO admin_cross_department_alerts (
    source_department, target_department, alert_type, title, message,
    priority, related_entity_type, related_entity_id, created_by_admin_id
  ) VALUES (
    _source_dept, _target_dept, _alert_type, _title, _message,
    _priority, _entity_type, _entity_id, _admin_id
  ) RETURNING id INTO _alert_id;

  -- Auto-create a department task for the target department
  INSERT INTO admin_department_tasks (
    department_slug, title, description, priority,
    related_entity_type, related_entity_id, status
  ) VALUES (
    _target_dept,
    '⚡ ' || _title,
    'Cross-department alert from ' || _source_dept || ': ' || COALESCE(_message, ''),
    _priority,
    _entity_type,
    _entity_id,
    'pending'
  );

  RETURN _alert_id;
END;
$$;
