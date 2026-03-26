
CREATE TABLE public.sanctions_screening_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_role text,
  full_name text NOT NULL,
  country text NOT NULL,
  screening_source text,
  result text NOT NULL,
  matched_entries jsonb DEFAULT '[]',
  risk_score numeric,
  screened_at timestamptz DEFAULT now(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  reviewed_by_admin boolean DEFAULT false,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sanctions_logs_user_id ON public.sanctions_screening_logs(user_id);
CREATE INDEX idx_sanctions_logs_result ON public.sanctions_screening_logs(result);

ALTER TABLE public.sanctions_screening_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sanctions logs"
ON public.sanctions_screening_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert sanctions logs"
ON public.sanctions_screening_logs
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update sanctions logs"
ON public.sanctions_screening_logs
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.sanctions_screening_logs;
