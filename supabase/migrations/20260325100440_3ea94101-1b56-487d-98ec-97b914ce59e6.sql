-- Table 1: vendor_widget_fees
CREATE TABLE public.vendor_widget_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  widget_state text NOT NULL DEFAULT 'never_installed',
  install_fee_paid boolean NOT NULL DEFAULT false,
  pending_restoration_fee boolean NOT NULL DEFAULT false,
  total_install_fees_charged numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_widget_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own widget fees" ON public.vendor_widget_fees
  FOR SELECT TO authenticated USING (vendor_id = auth.uid());

CREATE POLICY "Vendors update own widget fees" ON public.vendor_widget_fees
  FOR UPDATE TO authenticated USING (vendor_id = auth.uid());

CREATE POLICY "Admins read all widget fees" ON public.vendor_widget_fees
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth insert widget fees" ON public.vendor_widget_fees
  FOR INSERT TO authenticated WITH CHECK (true);

-- Table 2: notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins read all notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Table 3: ai_usage
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text,
  assistant_name text,
  tokens_used integer NOT NULL DEFAULT 0,
  query_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ai usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins read all ai usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth insert ai usage" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (true);