## Goal
Complete the testnet/mainnet decoupling for all four portals (Admin, Vendor, Buyer, Lender) beyond the visual hard-lock already shipped. Network mode becomes a first-class auth boundary, not just a UI flag.

---

## Step 1 — Dedicated sandbox login routes

Split login surfaces so testnet and mainnet never share a form. Each portal gets two routes:

```text
/admin/login            -> mainnet only (stamps tl_network = 'mainnet')
/admin/sandbox/login    -> testnet only (stamps tl_network = 'testnet')
/vendor/login           -> mainnet
/vendor/sandbox/login   -> testnet
/buyer/login            -> mainnet
/buyer/sandbox/login    -> testnet
/lender/login           -> mainnet
/lender/sandbox/login   -> testnet
```

Implementation:
- Add a `networkMode: 'testnet' | 'mainnet'` prop to each existing `*Login` page; render the mainnet route with `mainnet`, the sandbox route with `testnet`.
- Sandbox routes get an amber sentinel strip + "SANDBOX — testnet only" banner. Mainnet routes get a red "LIVE" banner.
- On successful auth, write `tl_network`, `tl_<portal>_network`, plus a new `tl_network_scope` key.
- Logout clears all four keys.
- Add `App.tsx` routes for the new `/sandbox/login` paths.

## Step 2 — JWT `network_scope` claim + RLS enforcement

Tag each authenticated session with its network so server-side policies can enforce isolation. Without this, a hijacked mainnet token could still query testnet rows or vice-versa.

Implementation:
- New table `public.user_network_sessions` (user_id, session_id, network_scope, issued_at, revoked_at). Written on login by an edge function `stamp-network-scope` that the login page calls right after `signInWithPassword`.
- New SECURITY DEFINER helper `public.current_network_scope()` returns `'testnet' | 'mainnet'` by reading the latest non-revoked row for `auth.uid()`.
- Add a `network_scope` column (default `'mainnet'`, NOT NULL) to network-sensitive tables: `transactions`, `os_payments`, `payouts`, `payout_requests`, `escrow_extensions`, `blockchain_proofs`, `gas_reserve_ledger`, `lender_disbursement_records`, `lender_certificates`, `checkout_sessions`, `disputes`.
- Backfill existing rows to `'mainnet'`.
- Add an RLS policy filter to each: `USING (network_scope = public.current_network_scope())` ANDed with existing ownership checks. Write triggers default `network_scope` from `current_network_scope()` on INSERT so app code doesn't need to set it.
- Logout calls `stamp-network-scope` with `revoke=true`.

## Step 3 — Separate TOTP enrollments per network (admin)

Admin 2FA already exists. Today one TOTP secret covers both networks; a stolen sandbox device could sign off a real mainnet payout.

Implementation:
- Extend `admin_accounts` with `totp_secret_testnet` and `totp_secret_mainnet` columns (migrate existing `totp_secret` → both, then drop the legacy column in a follow-up migration after verification).
- `AdminLogin` selects the column matching the route's `networkMode` during the TOTP step.
- Admin Settings → Security gains two enrollment cards: "Testnet 2FA" and "Mainnet 2FA", each with its own QR/recovery codes. Disabling one does not affect the other.
- Stealth-login behaviour unchanged (no feedback on bad code).

---

## Files (high level)
- `src/App.tsx` — add 4 sandbox routes
- `src/pages/admin/AdminLogin.tsx`, `VendorLogin.tsx`, `BuyerLogin.tsx`, `LenderLogin.tsx` — accept `networkMode` prop, write keys, call `stamp-network-scope`
- `src/pages/admin/SandboxAdminLogin.tsx` + 3 sibling wrappers — thin route components
- `src/pages/admin/AdminSecuritySettings.tsx` — dual-TOTP UI
- `supabase/functions/stamp-network-scope/index.ts` — new edge function
- Migration: `user_network_sessions`, `current_network_scope()`, `network_scope` columns + triggers + policies, admin TOTP split

## Memory updates
- Update `mem://auth/admin-network-isolation` to cover routes, JWT scope, dual TOTP across all portals.
- Add `mem://tech/security/network-scope-rls` describing the `current_network_scope()` + per-table column pattern so future tables inherit it.

## Out of scope
- Dropping legacy `admin_accounts.totp_secret` (separate cleanup migration after verifying dual-TOTP works).
- Per-portal RLS beyond the listed tables; we can expand once the pattern is proven.
