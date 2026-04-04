-- 1. Internal case notes on threads (admin-only)
CREATE TABLE public.thread_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  admin_account_id uuid NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.thread_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all internal notes"
  ON public.thread_internal_notes FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert internal notes"
  ON public.thread_internal_notes FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update own internal notes"
  ON public.thread_internal_notes FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_thread_internal_notes_thread ON public.thread_internal_notes(thread_id);

-- 2. Admin-to-admin direct messages
CREATE TABLE public.admin_direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_direct_messages ENABLE ROW LEVEL SECURITY;

-- Only admins can access, and only their own messages
CREATE POLICY "Admins read own direct messages"
  ON public.admin_direct_messages FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins send direct messages"
  ON public.admin_direct_messages FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update own direct messages"
  ON public.admin_direct_messages FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_admin_dm_sender ON public.admin_direct_messages(sender_id);
CREATE INDEX idx_admin_dm_recipient ON public.admin_direct_messages(recipient_id);
CREATE INDEX idx_admin_dm_created ON public.admin_direct_messages(created_at DESC);
