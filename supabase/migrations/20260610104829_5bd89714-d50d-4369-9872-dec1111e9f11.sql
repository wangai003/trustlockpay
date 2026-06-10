
ALTER TABLE public.admin_accounts
  ADD COLUMN IF NOT EXISTS mainnet_enabled boolean NOT NULL DEFAULT false;

-- Backfill: every currently-active admin keeps mainnet access so the new
-- gate does not lock anyone out. Going forward, new admins default to
-- false and must be explicitly enabled by the original chief.
UPDATE public.admin_accounts
   SET mainnet_enabled = true
 WHERE is_deleted = false;
