
-- Audit sessions table for regulator/auditor access
CREATE TABLE public.audit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Link-based access
  access_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  -- Account-based access (optional)
  auditor_name text NOT NULL,
  auditor_email text,
  auditor_password_hash text,
  -- Permissions
  allowed_tables text[] NOT NULL DEFAULT ARRAY['transactions', 'disputes', 'compliance_flags'],
  can_export boolean NOT NULL DEFAULT false,
  -- Lifecycle
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL DEFAULT 'admin',
  -- Logging
  access_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_accessed_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Only admins can manage audit sessions (via edge function with service role)
ALTER TABLE public.audit_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage audit sessions"
  ON public.audit_sessions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anon can read by token (for link-based access validation in edge function)
CREATE POLICY "Anon read audit sessions by token"
  ON public.audit_sessions FOR SELECT
  TO anon
  USING (true);

-- Audit access logs table for IP tracking
CREATE TABLE public.audit_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.audit_sessions(id) ON DELETE CASCADE NOT NULL,
  ip_address text,
  user_agent text,
  page_viewed text,
  action text DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs"
  ON public.audit_access_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon insert audit logs"
  ON public.audit_access_logs FOR INSERT
  TO anon
  WITH CHECK (true);
