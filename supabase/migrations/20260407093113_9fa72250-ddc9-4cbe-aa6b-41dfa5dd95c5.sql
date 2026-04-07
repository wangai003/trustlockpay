
-- Department workflow tasks
CREATE TABLE public.admin_department_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.admin_accounts(id),
  assigned_by UUID REFERENCES public.admin_accounts(id),
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  related_entity_type TEXT,
  related_entity_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track round-robin pointer per department
CREATE TABLE public.admin_department_rr_pointer (
  department_slug TEXT PRIMARY KEY,
  last_assigned_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dept_tasks_dept ON public.admin_department_tasks(department_slug);
CREATE INDEX idx_dept_tasks_assigned ON public.admin_department_tasks(assigned_to);
CREATE INDEX idx_dept_tasks_status ON public.admin_department_tasks(status);

-- RLS
ALTER TABLE public.admin_department_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_department_rr_pointer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.admin_department_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.admin_department_rr_pointer FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER update_dept_tasks_updated_at
  BEFORE UPDATE ON public.admin_department_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_department_tasks;
