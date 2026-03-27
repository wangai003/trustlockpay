
-- 1. Create user_onboarding_tasks table
CREATE TABLE public.user_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  role text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_key)
);

-- 2. Enable RLS
ALTER TABLE public.user_onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Users can read own tasks
CREATE POLICY "Users read own onboarding tasks"
  ON public.user_onboarding_tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert own tasks
CREATE POLICY "Users insert own onboarding tasks"
  ON public.user_onboarding_tasks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own tasks
CREATE POLICY "Users update own onboarding tasks"
  ON public.user_onboarding_tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all
CREATE POLICY "Admins read all onboarding tasks"
  ON public.user_onboarding_tasks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Auto-seed function triggered on new profile creation
CREATE OR REPLACE FUNCTION public.seed_onboarding_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role text;
  _vendor_tasks text[] := ARRAY['complete_profile', 'add_site', 'install_widget', 'kyc_verification', 'first_transaction', 'configure_payouts'];
  _buyer_tasks text[] := ARRAY['complete_profile', 'consent_form', 'first_purchase', 'confirm_delivery', 'review_milestones'];
  _task text;
BEGIN
  -- Get role from user_roles table
  SELECT role::text INTO _role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;

  IF _role = 'vendor' THEN
    FOREACH _task IN ARRAY _vendor_tasks LOOP
      INSERT INTO public.user_onboarding_tasks (user_id, task_key, role)
      VALUES (NEW.id, _task, 'vendor')
      ON CONFLICT (user_id, task_key) DO NOTHING;
    END LOOP;
  ELSIF _role = 'buyer' THEN
    FOREACH _task IN ARRAY _buyer_tasks LOOP
      INSERT INTO public.user_onboarding_tasks (user_id, task_key, role)
      VALUES (NEW.id, _task, 'buyer')
      ON CONFLICT (user_id, task_key) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger on profile creation
CREATE TRIGGER on_profile_created_seed_tasks
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_onboarding_tasks();
