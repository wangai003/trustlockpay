
-- Assignment Templates: reusable auto-assignment configs per workspace
CREATE TABLE public.team_assignment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.team_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  auto_trigger_mode text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_assignment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners manage templates" ON public.team_assignment_templates
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_workspaces tw
    WHERE tw.id = team_assignment_templates.workspace_id
      AND (tw.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Members read templates" ON public.team_assignment_templates
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.workspace_id = team_assignment_templates.workspace_id AND tm.user_id = auth.uid()
  ));

-- Template Rules: milestone-to-member mappings within a template
CREATE TABLE public.team_template_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.team_assignment_templates(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  milestone_label text,
  member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  auto_assign boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_template_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners manage rules" ON public.team_template_rules
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_assignment_templates tat
    JOIN public.team_workspaces tw ON tw.id = tat.workspace_id
    WHERE tat.id = team_template_rules.template_id
      AND (tw.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Members read rules" ON public.team_template_rules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_assignment_templates tat
    JOIN public.team_members tm ON tm.workspace_id = tat.workspace_id
    WHERE tat.id = team_template_rules.template_id AND tm.user_id = auth.uid()
  ));

-- Add auto_match_industry flag to workspaces
ALTER TABLE public.team_workspaces ADD COLUMN auto_match_industry boolean NOT NULL DEFAULT false;
