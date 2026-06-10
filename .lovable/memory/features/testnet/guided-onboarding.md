---
name: Guided Testnet Onboarding
description: Sandbox-style mission checklist layered on real vendor/buyer/lender testnet accounts — seeded state, bot counterparties, compressed clock, soft graduation to mainnet
type: feature
---

# Guided Testnet Onboarding

Brings the public sandbox's teaching mechanics into the real **testnet** portals for vendor, buyer, and lender — without forking the production UI or weakening network isolation.

## Architecture

- **Same auth, same chain, same RLS.** Testnet still means Polygon Amoy + JWT-stamped `network=testnet` + existing isolation pattern. Onboarding state is layered on top, not a replacement.
- **Tables:** `testnet_onboarding` (per-user/per-role mission progress + `paired_mode` + `graduated_at`), `testnet_demo_counterparties` (system bot accounts: demo_vendor_bot / demo_buyer_bot / demo_lender_bot), `testnet_clock_config` (single row — default `compression_ratio = 1440` = 1 day per minute).
- **Demo markers:** `is_testnet_demo` boolean on `transactions`, `lender_certificates`, `escrow_extensions`. `is_system` on `profiles` (hides bots from matchmaking/search).
- **Compressed clock helper:** `public.testnet_clock_effective_now(real_start, network)` — SECURITY DEFINER, granted to `authenticated`/`service_role` only. Mainnet branch returns `now()`. Testnet branch returns compressed elapsed time. Read-side only — never write fake timestamps into `created_at`/`updated_at`.

## Missions (declarative, in `src/lib/testnetMissions.ts`)

- **Vendor:** create offering → receive demo order → mark milestone complete → request payout
- **Buyer:** browse vendor widget → fund escrow → approve release → open & resolve dispute
- **Lender:** review application → issue certificate → track repayment → watch auto-release fire (compressed clock)

## UI

- `MissionChecklist` renders in each portal's Layout. Visible only when `network=testnet` AND not yet graduated. Floating right-rail panel showing progress %, current mission, CTA, and "Graduate" button.
- `GraduationBanner` renders on **mainnet** layouts when the same role has incomplete missions on testnet. Dismissible per-session. Soft nudge only — does NOT block mainnet access.

## Counterparty modes

- **Default = scripted bot.** System-owned `demo_*_bot` accounts auto-progress flows (fund escrow, mark milestone, confirm repayment) on a 30s timer.
- **Opt-in pairing** (`paired_mode = true` on `testnet_onboarding`): match with another real testnet user instead. Phase-1 stub queue; full UI is follow-up.

## Graduation policy

**Soft only.** Missions are encouraged but mainnet is always accessible. The `graduated_at` timestamp suppresses the mainnet banner once all missions are done. Never gate mainnet auth on testnet completion — that's a regression of this policy.

## Edge functions

- `mission-progress` — `{role, mission_id, action}` → upserts `testnet_onboarding.missions`. Validates auth via Authorization header. `action=graduate` sets `graduated_at`.
- (planned) `provision-testnet-account` — first-login seeder (KYC-approved-demo, faucet top-up, 4 sample transactions, role-specific extras). Idempotent on `seeded_at`. Rate-limited 1/hr/user.
- (planned) `testnet-bot-responder` — cron every 30s, scans bot-side pending actions and progresses them. Skips when `paired_mode = true`.

## What never changes

- Anchoring, audit trails, blockchain proofs remain truthful — only deadline comparisons consult the compressed clock.
- Mainnet UX is untouched except for the dismissible `GraduationBanner`.
- The public `/sandbox` lead-capture flow remains separate and unchanged.
- The admin sandbox at `/trustlock/admin/sandbox/login` remains separate and unchanged.
