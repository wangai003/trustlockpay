
CREATE TABLE public.industry_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  default_milestones jsonb NOT NULL,
  required_observer_roles text[] DEFAULT '{}',
  tax_rules jsonb DEFAULT '{}',
  compliance_requirements text[] DEFAULT '{}',
  estimated_duration_days integer,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read industry templates"
ON public.industry_templates
FOR SELECT TO anon, authenticated
USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.industry_templates;
