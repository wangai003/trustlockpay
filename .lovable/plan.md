
## Trade-Adaptive Fee Infrastructure — 6-Part Upgrade

### 1. Incoterms Awareness
- Add `incoterm` field to transactions table (EXW, FOB, CIF, DDP, etc.)
- Create an Incoterms responsibility matrix that maps which party (buyer/vendor) is responsible for each fee category based on the selected trade term
- Surface responsibility labels in the External Fee Tracker UI so each party knows what they owe
- Add Incoterms selector to checkout flow for international/regional trades

### 2. Multi-Currency Rollups
- Add `base_currency` and `exchange_rate_snapshot` columns to `external_fee_entries`
- Build a currency normalization utility that converts all fees to the escrow's base currency for rollup totals
- Display both original currency and normalized amount in the fee tracker UI
- Show combined multi-currency summary in milestone panels

### 3. Temporal Fee Classification
- Add `fee_phase` column to `external_fee_entries` (pre_shipment, in_transit, post_arrival, pre_escrow)
- Group fees by phase in the External Fee Tracker UI with collapsible sections
- Auto-suggest phase based on industry template and milestone position

### 4. Admin Escalation Thresholds
- Add a database trigger that fires when total external fees exceed 30% of escrow value
- Auto-create a cross-department alert to Finance + Compliance departments
- Show warning badge in admin transaction views for flagged transactions

### 5. Fee Dispute Resolution Path
- Add `dispute_status` and `dispute_note` columns to `external_fee_entries`
- When a fee is rejected, transition it to `disputed` status with a required note
- Create a mini-resolution flow: Rejected → Disputed → Revised/Withdrawn
- Notify admin if fee disputes remain unresolved for 48+ hours

### 6. Pre-Escrow Fee Logging
- Add `pre_escrow` boolean to `external_fee_entries` for costs incurred before lockup (LC fees, inspection costs)
- Allow vendors to log pre-escrow costs during checkout/onboarding phase
- Roll pre-escrow fees into the total cost summary but keep them visually separated

### Migration: Single SQL migration covering all schema changes
### Code: Update ExternalFeeTracker, ExternalFeeSummary, MilestoneWorkOrderPanel, and checkout components

---

## Lender Portal — Complete Implementation Plan (Final)

### Pre-Requisites & Decisions Locked In
- **Hybrid Encryption Model**: E2E for all peer DMs (buyer↔vendor, vendor↔lender, buyer↔lender), server-side AES-256-GCM at rest for admin channels (team chat, client inbox, staff DMs) so admins retain compliance/dispute oversight
- **Hard Logo Gate**: Lenders blocked from dashboard access until logo is uploaded to their profile
- **Auto-Bridging**: Vendor lender lookup auto-populates from `user_roles` + `lender_profiles` query (same proven pattern as existing buyer/vendor lookup — no manual bridging mechanism needed)
- **Mandatory Logo**: Lender logo is a required profile field; displayed in vendor-side lender lookup alongside institution name, verified badge, and operating regions
- **System-Wide Encryption**: Applies to ALL messaging channels across the entire platform (not just lender↔vendor)

---

### Phase 1: Database Schema & Auth Foundation

**1A. Lender Role & Profile**
- Add `'lender'` to `app_role` enum
- `lender_profiles` table:
  - `user_id` (FK → auth.users, UNIQUE), `institution_name`, `lending_license_number`, `license_jurisdiction`, `operating_regions` (text[]), `facility_limit` (numeric), `sector_focus` (text[]), `logo_url` (text — enforced as mandatory at app level via hard gate), `institution_type` (bank/microfinance/dfi/private_lender/cooperative), `website_url`, `bio`, `kyb_status` (pending/approved/rejected), `is_verified` (boolean), `status` (active/suspended), `terms_template` (jsonb — default rates, tenor, collateral prefs)
- `lender-assets` storage bucket (private, RLS: lender can upload to own `user_id/` path)
- RLS: Lenders CRUD own profile; vendors SELECT verified lenders only (`is_verified = true AND kyb_status = 'approved'`); admins SELECT all

**1B. Financing Application Tables**
- `financing_applications`:
  - `id`, `vendor_id`, `lender_id`, `certificate_id` (FK → lender_certificates), `transaction_id`, `requested_amount`, `proposed_terms` (jsonb), `status` (draft/submitted/under_review/approved/rejected/withdrawn), `lender_notes`, `vendor_notes`, `decision_at`, `created_at`, `updated_at`
- `financing_application_documents`:
  - `id`, `application_id` (FK), `document_type`, `file_url`, `file_name`, `uploaded_by`, `created_at`
- Industry-specific required document types defined in code (`lenderDocumentRules.ts`, same pattern as `documentFileRules.ts`)
- RLS: Vendor sees own apps; lender sees apps addressed to them; admin sees all

**1C. Lender KYB Queue**
- `lender_kyb_queue`:
  - `id`, `lender_id` (FK → lender_profiles), `submitted_documents` (jsonb), `status` (pending/under_review/approved/rejected), `reviewed_by`, `review_notes`, `created_at`, `updated_at`
- RLS: Lender INSERT/SELECT own; admin SELECT/UPDATE all

**1D. Notification Triggers (DB-level)**
- `financing_applications` status change → INSERT into `notifications` for BOTH vendor AND lender
- `lender_kyb_queue` status change → notify lender
- New `lender_profiles` row → notify admin team (cross-department alert to Compliance)
- Certificate approaching 90-day expiry → notify lender

---

### Phase 2: System-Wide Hybrid Encryption

**2A. Encryption Key Infrastructure**
- `encryption_keys` table:
  - `id`, `user_id` (FK → auth.users, UNIQUE), `public_key` (text — X25519), `key_version` (int), `created_at`, `rotated_at`
- On signup: client generates X25519 keypair → public key stored in `encryption_keys`, private key stored in browser IndexedDB (encrypted with user's password-derived key)
- Platform AES-256-GCM master key stored as Supabase secret (`PLATFORM_ENCRYPTION_KEY`)

**2B. E2E Encryption — Peer DMs**
- Applies to: ALL peer-to-peer messages in `messages` table:
  - buyer ↔ vendor
  - vendor ↔ lender
  - buyer ↔ lender
- Flow: Sender fetches recipient's public key → X25519 ECDH → derive shared secret → AES-256-GCM encrypt body client-side → INSERT encrypted body → recipient decrypts client-side
- Columns added: `is_encrypted` (boolean), `encryption_version` (int), `sender_public_key_id` (FK)

**2C. Server-Side Encryption at Rest — Admin Channels**
- Applies to:
  - `admin_direct_messages.body` (staff ↔ chief DMs)
  - `admin_dept_chat_messages.body` (team chat)
  - Admin client inbox messages (in `messages` table where recipient/sender is admin)
- `encrypt-message` edge function handles AES-256-GCM encrypt/decrypt using `PLATFORM_ENCRYPTION_KEY`
- Admins with proper auth can decrypt for compliance, disputes, and arbitration
- Columns added: `is_encrypted` (boolean), `encryption_version` (int)

**2D. Migration Path for Existing Messages**
- All existing messages remain unencrypted (`is_encrypted = false`)
- New messages from deployment forward use encryption (`is_encrypted = true, encryption_version = 1`)
- No retroactive encryption — clean break with audit trail noting the transition date

---

### Phase 3: Lender Dashboard & Onboarding

**3A. Auth Flow**
- `/trustlock/lender/signup` — email + password with `role: 'lender'` metadata + Google OAuth
- `/trustlock/lender/login` — standard auth
- `LenderLayout.tsx` with `LenderSidebar` and `LenderHeader`
- **Hard Gate Component** (`LenderOnboardingGate`): wraps all lender routes; checks `lender_profiles.logo_url` exists; if null → force redirect to mandatory profile setup page (no bypass)

**3B. Mandatory Profile Setup (First-Time Only)**
1. Upload logo (to `lender-assets/{user_id}/logo.*`) — REQUIRED, cannot skip
2. Institution name, type, license details
3. Operating regions (multi-select from 115+ corridors)
4. Sector focus (multi-select from 25 industries)
5. Bio/description, website URL
6. On completion → `lender_profiles` row created with `kyb_status: 'pending'` → `lender_kyb_queue` entry auto-created → admin notified

**3C. Lender Dashboard Pages**
- **Overview**: Portfolio metrics (active certificates, total exposure, completion rates, average days-to-release)
- **Portfolio / Certificates**: Browse escrow certificates with status, amounts, industries, blockchain proof chain
- **Applications**: Incoming financing requests from vendors with full control panel (approve/reject/request docs)
- **Vendor Lookup**: Browse verified vendors (same lookup pattern, role-reversed)
- **Messages**: E2E encrypted messaging with vendors
- **Blockchain Explorer**: Read-only `BlockchainExplorerPanel` for proof chain verification
- **Documents**: KYB docs, generated contracts, compliance records
- **Analytics**: Portfolio performance, sector concentration, geographic exposure
- **Settings**: Profile management, logo update, terms template, notification preferences

**3D. Lender Sidebar Navigation Order**
1. Overview
2. Portfolio
3. Applications
4. Vendor Lookup
5. Messages
6. Documents
7. Blockchain Explorer
8. Analytics
9. Settings

---

### Phase 4: Vendor-Side Financing Integration

**4A. Vendor Sidebar — "Lender Lookup" (Auto-Bridged)**
- New page: `/trustlock/vendor/lender-lookup`
- Uses SAME `UserLookupFilters` + `UserLookupCard` pattern as buyer/vendor lookup
- Query logic: `user_roles WHERE role = 'lender'` → fetch `lender_profiles WHERE is_verified = true AND kyb_status = 'approved'`
- Displays: **logo** (from `logo_url`), institution name, operating regions, sector focus, verified badge, institution type
- **Auto-updates automatically** — when a new lender signs up and gets KYB-approved, they instantly appear in vendor lookup. No manual bridging.
- Direct "Request Introduction" / "Message" action buttons

**4B. Vendor Sidebar — "Request Financing"**
- Ranked prominently: below Overview, above Orders
- Application wizard:
  1. Select locked escrow certificate (pre-fills all escrow data)
  2. Browse/select lender from directory (or choose from lender lookup)
  3. Upload industry-specific documents (gated per `lenderDocumentRules.ts`):
     - **All Industries**: Business registration, bank statements (3-month), tax clearance
     - **Agriculture**: Crop insurance, land title/lease, offtake agreement
     - **Mining**: Mining license, environmental permit, end-user certificate, geological survey
     - **Energy**: Power purchase agreement, grid connection approval, energy generation license
     - **Construction**: Building permits, project timeline, contractor insurance
     - **Manufacturing**: Equipment inventory, supply chain contracts
     - **Logistics**: Carrier license, cargo insurance, customs bond
     - **Pharmaceuticals**: Drug manufacturing license, GMP certificate
     - **Telecommunications**: Spectrum license, infrastructure permits
     - (etc. for all 25 industries)
  4. Propose terms (amount, tenor, collateral notes)
  5. Submit
- **Progress bar**: Draft → Submitted → Under Review → Decision (with real-time status updates)
- Notification triggers at every status transition

**4C. Vendor Sidebar Navigation — Updated Order**
1. Overview
2. **Lender Lookup** ← NEW
3. **Request Financing** ← NEW (prominent)
4. Orders
5. Buyer Lookup
6. Messages
7. Documents
8. (remaining existing items)

---

### Phase 5: Lender Control Panel & Admin Integration

**5A. Lender Application Processing**
- Incoming queue with filters (industry, amount, status, corridor)
- Per-application control panel:
  - View escrow certificate + blockchain proof chain
  - View vendor history (completion rate, average days-to-release)
  - Review uploaded documents
  - Actions: Approve / Reject / Request More Info
  - Notes field for each action
- All status changes trigger vendor notifications

**5B. Contract Generation**
- `generate-lender-contract` edge function (jsPDF)
- Inputs: lender logo (from `lender_profiles.logo_url`), financing terms, certificate data, milestone schedule, governing law (from corridor)
- Output: Professional PDF with:
  - Lender logo as letterhead/seal
  - Milestone-linked repayment trigger clauses
  - Dual-signature blocks (digital + physical)
  - Governing law clause based on currency corridor
  - Downloadable/printable by both parties (free copies)
  - Auto-signed versions where vendor has auto-signature consent
- Auto-archived in `protection-documents` bucket with 7-year retention
- Anchored to SHA-256 blockchain proof chain

**5C. Admin KYB Review**
- Admin page: `/trustlock/admin/lender-kyb`
- Review submitted KYB documents, approve/reject with notes
- On approval → `is_verified = true` → lender appears in vendor lookup immediately
- On rejection → notification to lender with reasons, can resubmit
- Cross-department alert from Compliance to Executive on each decision

**5D. Offline Repayment Workflow**
- Milestone release triggers auto-generated "Repayment Due Notice" PDF
- Vendors can log "Offline Repayment Confirmation" with proof upload
- Lender acknowledges/disputes the confirmation
- Full audit trail logged — no TrustLock payment rail needed

---

### Phase 6: Analytics, Sandbox & Final Wiring

**6A. Lender Analytics**
- Portfolio performance: completion rates by industry/corridor
- Average days-to-release trends
- Sector concentration analysis with alerts at thresholds
- Geographic exposure breakdown (all 115+ jurisdictions)
- Facility utilization tracking

**6B. Sandbox Demo**
- `/trustlock/sandbox/lender-overview` with mock lender dashboard
- Pre-populated portfolio data, sample certificates, demo financing applications
- 8+ mock lender profiles in sandbox data for vendor lookup demo

**6C. Final Security Audit**
- RLS policy verification for all new tables
- Encryption key rotation mechanism tested
- Cross-role access testing (lender can't see buyer data, vendor can't see lender internals)
- Notification trigger validation (all status changes fire correctly)
- Security scan after all schema changes
- Input validation on all edge functions (Zod schemas)

---

### Security Checklist
- [ ] All new tables have RLS enabled with proper policies
- [ ] `lender` role added to `app_role` enum
- [ ] Lender data isolated via RLS (own-data access only)
- [ ] KYB approval required before vendor-facing visibility
- [ ] Logo upload MANDATORY before dashboard access (hard gate — no bypass)
- [ ] Hybrid encryption deployed across ALL message channels system-wide
- [ ] E2E keys generated on signup, public keys in DB, private keys client-side only (IndexedDB)
- [ ] Admin channels use server-side AES-256-GCM at rest with platform master key
- [ ] Financing contracts auto-archived with 7-year retention + blockchain anchor
- [ ] Notification triggers on ALL status transitions (financing apps, KYB, messages)
- [ ] No raw SQL or user-provided SQL in edge functions
- [ ] Auto-bridging verified: new verified lender instantly appears in vendor lookup
- [ ] Lender logo displayed in all lookup cards and contract headers
