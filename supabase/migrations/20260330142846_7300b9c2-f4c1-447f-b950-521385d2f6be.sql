
CREATE TABLE public.document_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_key text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  os_payment_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, document_key, purchased_at)
);

ALTER TABLE public.document_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own document access"
  ON public.document_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own document access"
  ON public.document_access FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all document access"
  ON public.document_access FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
