
# Guided Testnet — Sandbox-Style Onboarding for Real Testnet Accounts

## Goal
Make the vendor, buyer, and lender **testnet** portals teach the mainnet workflow the way the public `/sandbox` teaches the product — with seeded state, scripted missions, AI coaching, and a compressed clock — without weakening network isolation or replacing the real testnet UI.

## Principles
- **Same auth, same chain, same RLS.** Testnet still means Polygon Amoy, JWT-stamped `network=testnet`, and the existing isolation pattern. We only layer onboarding state on top.
- **Soft graduation.** Missions are encouraged, not required. Mainnet stays accessible; banners and CTAs nudge users to finish testnet first.
- **Read the real UI, don't fork it.** Missions point users *into* the existing testnet dashboard rather than rebuilding a parallel UI. Tooltips and a checklist overlay are the only new surface.
- **One demo counterparty per role, plus opt-in pairing.** Default = scripted bot. Power users can flip a switch and be matched with another real testnet user.
- **Compressed clock is the default on testnet only.** Time-based logic (auto-release tiebreaker, billing deadlines, certificate expiry) reads from a `testnet_clock` helper that returns minutes-as-days.

---

## Phase 1 — Data model

### `testnet_onboarding` (new)
Per (user_id, role) row tracking mission progress.
- `user_id`, `role` (`vendor` | `buyer` | `lender`)
- `seeded_at` (timestamp; null until first login provisioning runs)
- `missions` (jsonb: `{ m1: 'done', m2: 'in_progress', ... }`)
- `graduated_at` (nullable; set when all missions complete)
- `paired_mode` (boolean, default false — true = match with real users instead of bot)
- Standard RLS: owner read/write, service_role all.

### `testnet_demo_counterparties` (new)
System-owned bot accounts: `demo_vendor_bot`, `demo_buyer_bot`, `demo_lender_bot`. Each has a real `profiles` row + KYC-approved-demo flag. Bot replies are driven by `testnet_bot_responder` cron edge function.

### `testnet_clock_config` (new, single row)
- `compression_ratio` (default 1440 → 1 day = 1 minute)
- `enabled_for_roles` (text[])

### `transactions` / `lender_certificates` / `escrow_extensions`
Add `is_testnet_demo` boolean. No business logic changes — just lets the responder bot and missions filter their own records.

---

## Phase 2 — Edge functions

### `provision-testnet-account` (new)
Triggered on first testnet login per role. Creates:
- 1 `testnet_onboarding` row
- Pre-approved KYC/KYB rows in demo mode
- Testnet POL + mock USDC top-up via existing faucet logic
- 4 sample transactions across lifecycle states (negotiation, escrowed, in-dispute, settled) wired to the role-appropriate `demo_*_bot`
- For lenders: 2 sample financing applications + 1 issued certificate
- For vendors: 1 starter offering ("Demo Service") + 1 widget config

Idempotent — re-running on existing `seeded_at` is a no-op.

### `testnet-bot-responder` (new, cron every 30s)
Scans pending bot-side actions and progresses them:
- Buyer-bot funds escrows created by vendors in mission flow
- Vendor-bot marks milestones complete after buyer approval
- Lender-bot submits repayment confirmations
Skips when `paired_mode = true` on the human side.

### `testnet-clock` (new, helper)
Returns "effective now" for any deadline: `real_elapsed_seconds * compression_ratio`. All testnet-only auto-release/expiry workers consult this instead of `now()`. Mainnet code path unchanged.

### `mission-progress` (new)
Single endpoint missions call: `{role, mission_id, action}` → updates `testnet_onboarding.missions`, returns next mission. Used by event listeners on key UI actions (offering created, escrow funded, milestone approved, dispute opened, certificate issued, etc.).

---

## Phase 3 — Frontend (new components, no fork of existing portals)

### Shared
- `src/components/testnet/MissionChecklist.tsx` — floating right-rail panel on every testnet dashboard. Shows current mission, "what to do next" CTA, progress bar, "Graduate" button.
- `src/components/testnet/TestnetCoachOverlay.tsx` — reuses Amani/Zawadi/Emmanuel chat bubbles to narrate each mission step.
- `src/components/testnet/GraduationBanner.tsx` — soft banner on mainnet portals when a role has not yet graduated on testnet.
- `src/components/testnet/PairModeToggle.tsx` — in testnet settings; flips bot↔real-pair.
- `src/lib/testnetMissions.ts` — declarative mission definitions per role.

### Per portal
- Vendor missions: Create offering → Receive demo order → Mark milestone complete → Trigger payout
- Buyer missions: Browse demo widget → Fund escrow → Approve release → Open & resolve dispute
- Lender missions: Review application → Issue certificate → Track repayment → Watch auto-release tiebreaker fire (compressed-clock demo)

Each portal's dashboard renders `<MissionChecklist role="..." />` only when JWT scope = testnet AND `testnet_onboarding.graduated_at IS NULL`.

---

## Phase 4 — Compressed clock wiring

Audit time-based workers (`auto-release-protocol`, `lender-certificate-expiry`, `billing-deadline-enforcer`, `escrow-extension-tiebreaker`) and replace direct `now()` reads with `testnet_clock_now(network, real_ts)`. Mainnet branch returns `real_ts`; testnet branch returns compressed value. One helper SQL function plus matching TS helper.

---

## Phase 5 — Memory + docs
- New memory `mem://features/testnet/guided-onboarding` documenting the missions, seeded state, bot vs pair mode, soft graduation, and compressed clock.
- Update `mem://auth/admin-network-isolation` cross-link.
- Update `.lovable/plan.md`.

---

## Out of scope
- No changes to mainnet UX besides the soft `GraduationBanner`.
- No new auth routes — uses existing testnet logins.
- No changes to admin sandbox (separate concern, already shipped).
- Real-pair matchmaking ships as a stub queue in Phase 1; full pairing UI is a follow-up.

## Technical notes
- All new tables get explicit `GRANT` + RLS per project standard.
- Bot accounts use service-role-only writes; their `profiles` rows are flagged `is_system = true` and hidden from matchmaking/search.
- Compression helper is **read-side only** — we never write fake timestamps to `created_at`/`updated_at`; we only adjust elapsed-time comparisons. Anchoring & audit trails stay truthful.
- Provisioning is rate-limited per user_id (1 per hour) to prevent faucet abuse.

---

## Status — 2026-06-10

✅ **Phase 1 (data)** — `testnet_onboarding`, `testnet_demo_counterparties`, `testnet_clock_config`, `is_testnet_demo` markers, `testnet_clock_effective_now` SQL helper.
✅ **Phase 2 (edge functions)** — `mission-progress`, `provision-testnet-account` (idempotent, rate-limited), `testnet-bot-responder` (cron `testnet-bot-responder-30s` every 30s via pg_cron + pg_net).
✅ **Phase 3 (frontend)** — `MissionChecklist`, `GraduationBanner`, `testnetMissions`, wired into Vendor/Buyer/Lender layouts.
✅ **Phase 4 (compressed clock)** — SQL helper + `src/lib/testnetClock.ts`. No existing time-based workers to rewire yet; future auto-release / certificate-expiry workers should call the helper.
✅ **Phase 5 (docs)** — memory at `mem://tech/testnet/guided-onboarding`.

**Outstanding (separate task):** seed real `auth.users` rows for the three demo bot accounts and populate `testnet_demo_counterparties.bot_user_id`. Until then, provisioning still creates onboarding rows but skips demo transactions.
