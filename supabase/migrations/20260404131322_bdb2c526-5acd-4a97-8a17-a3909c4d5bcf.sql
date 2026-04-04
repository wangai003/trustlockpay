
-- Team workspace chat messages
CREATE TABLE public.team_workspace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.team_workspaces(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  attachment_url text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_twm_workspace ON public.team_workspace_messages(workspace_id, created_at DESC);
CREATE INDEX idx_twm_sender ON public.team_workspace_messages(sender_id);

-- Enable RLS
ALTER TABLE public.team_workspace_messages ENABLE ROW LEVEL SECURITY;

-- Only workspace members can read messages
CREATE POLICY "Workspace members read messages"
ON public.team_workspace_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.workspace_id = team_workspace_messages.workspace_id
      AND tm.user_id = auth.uid()
  )
);

-- Only workspace members can send messages (as themselves)
CREATE POLICY "Workspace members send messages"
ON public.team_workspace_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.workspace_id = team_workspace_messages.workspace_id
      AND tm.user_id = auth.uid()
  )
);

-- Members can mark messages as read
CREATE POLICY "Members update read status"
ON public.team_workspace_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.workspace_id = team_workspace_messages.workspace_id
      AND tm.user_id = auth.uid()
  )
);

-- Admins can read all
CREATE POLICY "Admins read all workspace messages"
ON public.team_workspace_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_workspace_messages;
