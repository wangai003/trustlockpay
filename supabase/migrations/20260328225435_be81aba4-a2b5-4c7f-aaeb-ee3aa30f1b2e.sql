
-- Fix: drop the partially created table and recreate properly
DROP TABLE IF EXISTS public.team_task_assignments CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.team_workspaces CASCADE;

-- 1. Team Workspaces
CREATE TABLE public.team_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  industry text NOT NULL DEFAULT 'default',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  role text NOT NULL DEFAULT 'vendor',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own workspaces" ON public.team_workspaces
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth insert workspaces" ON public.team_workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners update workspaces" ON public.team_workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Team Members
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.team_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'member',
  can_finalize boolean NOT NULL DEFAULT false,
  added_by uuid NOT NULL,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners manage members" ON public.team_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_workspaces tw
    WHERE tw.id = team_members.workspace_id AND (tw.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Members read own membership" ON public.team_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. Team Task Assignments
CREATE TABLE public.team_task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.team_workspaces(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  milestone_label text,
  instructions text,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  evidence_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners manage assignments" ON public.team_task_assignments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_workspaces tw
    WHERE tw.id = team_task_assignments.workspace_id AND (tw.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Assigned members read own tasks" ON public.team_task_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = team_task_assignments.member_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Assigned members update own tasks" ON public.team_task_assignments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = team_task_assignments.member_id AND tm.user_id = auth.uid()
  ));

-- 4. Now add the cross-reference policy on team_workspaces
CREATE POLICY "Members read assigned workspaces" ON public.team_workspaces
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.workspace_id = team_workspaces.id AND tm.user_id = auth.uid()
  ));
