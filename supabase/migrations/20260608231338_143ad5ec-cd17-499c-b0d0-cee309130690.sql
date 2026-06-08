CREATE TABLE public.saved_payout_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain text NOT NULL,
  token text NOT NULL DEFAULT 'USDC',
  address text NOT NULL,
  label text,
  is_default boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_payout_wallets TO authenticated;
GRANT ALL ON public.saved_payout_wallets TO service_role;

ALTER TABLE public.saved_payout_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved payout wallets"
ON public.saved_payout_wallets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- One default per (user, chain, token)
CREATE UNIQUE INDEX saved_payout_wallets_one_default
ON public.saved_payout_wallets (user_id, chain, token)
WHERE is_default = true;

-- No duplicate addresses per user per chain+token
CREATE UNIQUE INDEX saved_payout_wallets_unique_addr
ON public.saved_payout_wallets (user_id, chain, token, lower(address));

CREATE INDEX saved_payout_wallets_user_idx
ON public.saved_payout_wallets (user_id, chain, token);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_saved_payout_wallets()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_saved_payout_wallets_touch
BEFORE UPDATE ON public.saved_payout_wallets
FOR EACH ROW EXECUTE FUNCTION public.touch_saved_payout_wallets();

-- Safety trigger: block system custodian wallets being saved as payout destinations
CREATE OR REPLACE FUNCTION public.guard_saved_payout_wallets()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  blocked text[];
BEGIN
  -- Known system custodian wallets (lowercase). These must never be a user payout destination.
  blocked := ARRAY[
    lower('0x0000000000000000000000000000000000000000')
  ];
  IF lower(NEW.address) = ANY(blocked) THEN
    RAISE EXCEPTION 'Address is reserved or invalid';
  END IF;
  IF length(NEW.address) < 26 THEN
    RAISE EXCEPTION 'Address looks invalid';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_saved_payout_wallets_guard
BEFORE INSERT OR UPDATE ON public.saved_payout_wallets
FOR EACH ROW EXECUTE FUNCTION public.guard_saved_payout_wallets();