
CREATE TABLE IF NOT EXISTS public.user_network_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network_scope text NOT NULL CHECK (network_scope IN ('testnet','mainnet')),
  portal text NOT NULL CHECK (portal IN ('admin','vendor','buyer','lender')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  user_agent text,
  ip_address text
);

GRANT SELECT, INSERT, UPDATE ON public.user_network_sessions TO authenticated;
GRANT ALL ON public.user_network_sessions TO service_role;
ALTER TABLE public.user_network_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own network sessions" ON public.user_network_sessions;
CREATE POLICY "users read own network sessions"
  ON public.user_network_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service role manages network sessions" ON public.user_network_sessions;
CREATE POLICY "service role manages network sessions"
  ON public.user_network_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS user_network_sessions_active_idx
  ON public.user_network_sessions (user_id, issued_at DESC)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.current_network_scope()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT network_scope
       FROM public.user_network_sessions
      WHERE user_id = auth.uid()
        AND revoked_at IS NULL
      ORDER BY issued_at DESC
      LIMIT 1),
    'mainnet'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_network_scope() TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.set_network_scope_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.network_scope IS NULL THEN
    NEW.network_scope := public.current_network_scope();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'transactions','os_payments','payouts','payout_requests',
    'escrow_extensions','blockchain_proofs','gas_reserve_ledger',
    'lender_disbursement_records','lender_certificates',
    'checkout_sessions','disputes'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS network_scope text NOT NULL DEFAULT ''mainnet''',
      t
    );

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = t || '_network_scope_chk'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (network_scope IN (''testnet'',''mainnet''))',
        t, t || '_network_scope_chk'
      );
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS set_network_scope_default_trg ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_network_scope_default_trg
        BEFORE INSERT ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_network_scope_default()',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS network_scope_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY network_scope_isolation ON public.%I
         AS RESTRICTIVE
         FOR ALL TO authenticated
         USING (network_scope = public.current_network_scope())
         WITH CHECK (network_scope = public.current_network_scope())',
      t
    );
  END LOOP;
END $$;

ALTER TABLE public.admin_accounts
  ADD COLUMN IF NOT EXISTS totp_secret_testnet text,
  ADD COLUMN IF NOT EXISTS totp_secret_mainnet text,
  ADD COLUMN IF NOT EXISTS totp_enrolled_testnet_at timestamptz,
  ADD COLUMN IF NOT EXISTS totp_enrolled_mainnet_at timestamptz;
