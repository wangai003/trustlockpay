
-- 1. Admin aliases for anonymous messaging
CREATE TABLE public.admin_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admin_id),
  UNIQUE(alias)
);

ALTER TABLE public.admin_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all aliases"
  ON public.admin_aliases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert own alias"
  ON public.admin_aliases FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Admin action log for accountability
CREATE TABLE public.admin_action_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_accounts(id),
  action_type TEXT NOT NULL,
  case_id TEXT,
  case_type TEXT,
  justification TEXT,
  is_deviation BOOLEAN NOT NULL DEFAULT false,
  deviation_details TEXT,
  requires_chief_review BOOLEAN NOT NULL DEFAULT false,
  chief_reviewed_at TIMESTAMPTZ,
  chief_decision TEXT,
  chief_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all action logs"
  ON public.admin_action_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert action logs"
  ON public.admin_action_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update action logs"
  ON public.admin_action_log FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add shared inbox columns to message_threads
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.admin_accounts(id),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS case_status TEXT NOT NULL DEFAULT 'open';

-- 4. Add chief admin override columns to disputes
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS override_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS overridden_by UUID REFERENCES public.admin_accounts(id),
  ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_resolution TEXT;

-- 5. Chief admin designation table
CREATE TABLE public.chief_admin_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_accounts(id),
  designated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  designated_by TEXT NOT NULL DEFAULT 'system',
  is_active BOOLEAN NOT NULL DEFAULT true,
  override_window_hours INTEGER NOT NULL DEFAULT 48
);

ALTER TABLE public.chief_admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view chief config"
  ON public.chief_admin_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Index for fast lookups
CREATE INDEX idx_action_log_admin ON public.admin_action_log(admin_id);
CREATE INDEX idx_action_log_case ON public.admin_action_log(case_id);
CREATE INDEX idx_action_log_deviation ON public.admin_action_log(is_deviation) WHERE is_deviation = true;
CREATE INDEX idx_threads_claimed ON public.message_threads(claimed_by) WHERE claimed_by IS NOT NULL;
CREATE INDEX idx_disputes_override ON public.disputes(override_deadline) WHERE override_deadline IS NOT NULL;

-- 7. Function to generate unique admin alias
CREATE OR REPLACE FUNCTION public.generate_admin_alias()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _alias TEXT;
  _exists BOOLEAN;
BEGIN
  LOOP
    _alias := 'TL-Agent-' || lpad((floor(random() * 9999 + 1))::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM admin_aliases WHERE alias = _alias) INTO _exists;
    EXIT WHEN NOT _exists;
  END LOOP;
  RETURN _alias;
END;
$$;

-- 8. Auto-assign alias on admin account creation
CREATE OR REPLACE FUNCTION public.auto_assign_admin_alias()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.admin_aliases (admin_id, alias)
  VALUES (NEW.id, public.generate_admin_alias())
  ON CONFLICT (admin_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_admin_alias
  AFTER INSERT ON public.admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_alias();
