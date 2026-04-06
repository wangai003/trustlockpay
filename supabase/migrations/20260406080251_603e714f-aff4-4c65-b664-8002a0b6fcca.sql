
-- Add adaptive auto-release fields to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS auto_release_days integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS auto_release_date timestamptz,
  ADD COLUMN IF NOT EXISTS auto_release_extended_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_release_paused boolean DEFAULT false;

-- Buyer extension requests
CREATE TABLE public.escrow_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  tx_id text NOT NULL,
  requested_by uuid NOT NULL,
  reason text NOT NULL,
  extra_days integer NOT NULL DEFAULT 14,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escrow_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extensions"
  ON public.escrow_extensions FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Users can request extensions"
  ON public.escrow_extensions FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Release reminder log (prevents duplicate notifications)
CREATE TABLE public.escrow_release_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  reminder_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, reminder_type)
);

ALTER TABLE public.escrow_release_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for reminders"
  ON public.escrow_release_reminders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Industry-specific default release windows (function for use in edge functions)
CREATE OR REPLACE FUNCTION public.get_industry_release_days(p_industry text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_industry
    WHEN 'ecommerce' THEN 14
    WHEN 'tourism' THEN 14
    WHEN 'freelance' THEN 14
    WHEN 'logistics' THEN 45
    WHEN 'automotive' THEN 45
    WHEN 'agriculture' THEN 45
    WHEN 'textiles' THEN 45
    WHEN 'food_beverage' THEN 30
    WHEN 'pharmaceuticals' THEN 30
    WHEN 'telecommunications' THEN 30
    WHEN 'manufacturing' THEN 60
    WHEN 'energy' THEN 60
    WHEN 'mining' THEN 60
    WHEN 'marine_fisheries' THEN 60
    WHEN 'aviation' THEN 60
    WHEN 'construction' THEN 90
    WHEN 'real_estate' THEN 90
    WHEN 'renewable_energy' THEN 60
    WHEN 'water_sanitation' THEN 60
    WHEN 'waste_management' THEN 45
    WHEN 'education' THEN 30
    WHEN 'media_entertainment' THEN 30
    WHEN 'insurance' THEN 45
    WHEN 'legal_services' THEN 30
    WHEN 'project_management' THEN 60
    ELSE 14
  END;
$$;
