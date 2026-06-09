# Failed Routing Queue & Auto-Retry Mechanism

Build a durable queue that captures every routing attempt that fails (inbound payments, escrow releases, splits, refunds, milestone payouts, vendor off-ramps) so the system can automatically retry once the blocking condition is resolved — without ever re-charging fees that were already deducted.

## 1. New table: `routing_retry_queue`

Columns:
- `id` uuid pk
- `transaction_id` uuid (nullable for pre-escrow inbound)
- `milestone_id` uuid nullable
- `surface` text — one of `trustlock_os_pay`, `trustlock_os_payout`, `admin_os_pay`
- `action` text — `route_inbound`, `route_release`, `route_split`, `route_refund`, `route_milestone`, `route_refund_milestone`, `route_vendor_payout`
- `recipient_user_id` uuid, `recipient_role` text (buyer/vendor/admin/platform)
- `recipient_address` text, `recipient_chain` text, `recipient_method` text (crypto/stripe/transak/bank/mobile)
- `amount_principal` numeric, `amount_fee_already_taken` numeric (locks in the prior fee skim — never re-deducted)
- `fee_phase` text — `upfront_taken`, `escrow_fee_taken`, `none`
- `original_payload` jsonb — exact bridge call args for replay
- `failure_reason` text, `failure_code` text, `failure_details` jsonb
- `attempt_count` int default 0, `max_attempts` int default 10
- `next_retry_at` timestamptz, `last_attempted_at` timestamptz
- `status` text — `queued`, `awaiting_update`, `retrying`, `completed`, `abandoned`, `manual_required`
- `unblocked_by` text nullable — `wallet_added`, `wallet_verified`, `processor_configured`, `kyc_cleared`, `manual_admin`, `auto_backoff`
- `created_at`, `updated_at`, `resolved_at`

Indexes on `(status, next_retry_at)`, `(recipient_user_id, status)`, `(transaction_id)`.
RLS: service_role full; users SELECT their own rows; admins SELECT all.

## 2. Wallet-routing-bridge changes

Every failure path (missing wallet, unverified address, chain mismatch, processor 4xx/5xx, gas shortfall, KYC hold, etc.) now:
1. Inserts a `routing_retry_queue` row capturing the **exact** payload + the fee phase already completed.
2. Returns `{ queued: true, retryId, reason }` to the caller instead of just an error.
3. Writes a notification to the affected user + admins (success or failure — always notified, per prior rule).
4. Anchors a `routing_failure` proof to `blockchain_proofs`.

A new bridge action `retry_queued(retryId)` re-executes the original payload but **forces** `skipFee: true` when `amount_fee_already_taken > 0`, so the 1% escrow fee or 0.5% upfront fee cannot be charged twice.

## 3. New edge function: `routing-retry-worker`

Cron-triggered every 2 minutes via pg_cron + pg_net. For each row where `status in ('queued','awaiting_update')` and `next_retry_at <= now()`:
- Re-checks the unblock condition (e.g. wallet now saved/verified, processor key now configured, KYC cleared).
- If unblocked → calls bridge `retry_queued`.
- On success → `status='completed'`, notifies user.
- On failure → exponential backoff (`2^attempt` minutes capped at 24h), increments `attempt_count`. At `max_attempts` → `status='manual_required'` and pages admins.

## 4. Event-driven instant retry (no waiting for cron)

Postgres triggers fire `pg_notify('routing_unblocked', retry_id)` when:
- `saved_payout_wallets` insert/verify for a user with queued rows
- `profiles.wallet_verified` flips true
- `kyc_queue.status` → `approved`
- `platform_config` / secret rotation marks a processor ready
- Admin manually resolves via UI

A lightweight listener inside `routing-retry-worker` (invoked by `admin-route-inbound` style trigger) processes the notify queue immediately so users see retries within seconds of fixing the blocker.

## 5. UI surfacing

- Vendor/Buyer dashboards: existing notifications already trigger; add a "Pending Routing" card in `TrustLockOSPay` and `TrustLockOSPayout` that lists their queued rows with the failure reason and a "Fix now" CTA deep-linking to the missing piece (wallet form, KYC, etc.).
- Admin: new panel in Admin OS Pay → `RoutingRetryQueuePanel` showing all `manual_required` and `awaiting_update` rows with manual "Retry now" and "Abandon" buttons.

## 6. Fee-safety invariant (critical)

The bridge's retry path computes amounts as:
```
principal_to_route = amount_principal           // never re-multiplied
fee_to_skim        = (amount_fee_already_taken > 0) ? 0 : original_fee_calc
```
A check constraint + the bridge guard both enforce this so the 1% can never be skimmed off the 99% on a refund retry.

## Files to add/modify

- migration: `routing_retry_queue` + grants + RLS + indexes + triggers
- new edge function: `supabase/functions/routing-retry-worker/index.ts`
- edit: `supabase/functions/wallet-routing-bridge/index.ts` — wrap each action's failure path with `enqueueRetry()`, add `retry_queued` action, honor `skipFee`
- edit: `supabase/functions/payout-router/index.ts`, `refund-router/index.ts`, `escrow-manager/index.ts` — pass `feeAlreadyTaken` to bridge
- new component: `src/components/shared/PendingRoutingCard.tsx` (used in `TrustLockOSPay`, `TrustLockOSPayout`)
- new component: `src/components/admin/RoutingRetryQueuePanel.tsx` mounted in Admin OS Pay page
- cron job SQL (inserted, not migrated) to invoke `routing-retry-worker` every 2 minutes

## Scope guarantees

- Covers all three surfaces: TrustLock OS Pay (inbound), TrustLock OS Payout (vendor off-ramp), Admin OS Pay (release/split/refund/milestone).
- Captures recipient(s), UTC timestamps, failure reason, original payload, and fee phase for every failed leg.
- Never double-charges fees; principal-only retries when fee already taken.
- Auto-fires on real-world unblock events; cron as safety net.
- User + admin notifications on every attempt (success or failure).

Approve to implement.
