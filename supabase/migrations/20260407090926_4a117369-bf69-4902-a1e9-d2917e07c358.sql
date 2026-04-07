
-- Add team lead flag to admin_accounts
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS is_team_lead boolean NOT NULL DEFAULT false;

-- Department transfer log
CREATE TABLE IF NOT EXISTS public.admin_department_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  from_department_slug text NOT NULL,
  to_department_slug text NOT NULL,
  transferred_by uuid NOT NULL REFERENCES public.admin_accounts(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_department_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to department transfers" ON public.admin_department_transfers
  FOR ALL USING (true) WITH CHECK (true);

-- Department team chat messages
CREATE TABLE IF NOT EXISTS public.admin_dept_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  sender_id uuid NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_dept_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to dept chat" ON public.admin_dept_chat_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for dept chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_dept_chat_messages;
