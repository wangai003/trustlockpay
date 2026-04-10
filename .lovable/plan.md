
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

## Lender Portal — Complete 5-Phase Implementation Plan

### Phase 1: Database Schema & Auth Foundation
**Tables:**
- `lender_profiles` — institution name, license number, operating jurisdictions, currency corridors, lending sectors, KYB status, terms templates (rates, tenor, collateral requirements per industry)
- `lender_kyb_queue` — admin review queue for institutional verification
- `lender_kyb_documents` — regulatory docs (lending license, business registration, regulatory authorization, AML policy, audited financials)
- `financing_applications` — vendor submissions using locked certificates as collateral (draft → submitted → under_review → approved → rejected → withdrawn)
- `financing_application_documents` — industry-specific required documents per application
- `lender_messages` — encrypted messaging bridge threads between lenders and vendors
- `lender_notifications` — lender-specific alerts

**Auth & Security:**
- Add `lender` to `app_role` enum
- RLS policies isolating lender data
- Lender signup with email verification + Google OAuth
- Session timeout enforcement

**Triggers:**
- Auto-create `lender_profiles` on signup
- Auto-notify vendor on application status change
- Auto-notify lender on new application
- Auto-notify both on messages
- Certificate expiry alerts (approaching 90-day limit)

### Phase 2: Lender Portal UI — Signup, Dashboard & Certificate Portfolio
**Pages:**
- `/trustlock/lender/signup` — guided institutional onboarding
- `/trustlock/lender/login` — standard auth
- `/trustlock/lender/overview` — portfolio dashboard
- `/trustlock/lender/certificates` — certificate browser with blockchain proof chain
- `/trustlock/lender/settings` — profile, terms, jurisdictions

**Sidebar:** Overview, Certificates, Applications, Vendor Lookup, Messages, Analytics, Documents, Settings

**Metrics (from existing data — no new payment rail):**
- Escrow Completion Rate (% released vs disputed/refunded)
- Average Days-to-Release per vendor & industry
- Dispute Rate per corridor/sector

### Phase 3: Vendor-Side Financing & Document Requirements
**Vendor sidebar:** "Request Financing" ranked prominently (below Orders, above Documents)

**Application flow:**
- Select locked certificate → pre-fills escrow data
- Upload industry-specific documents:
  - **All**: Business registration, bank statements (3-month), tax clearance
  - **Agriculture**: Crop insurance, land title/lease, offtake agreement
  - **Mining**: Mining license, environmental permit, end-user certificate
  - **Energy**: Power purchase agreement, grid connection approval
  - **Construction**: Building permits, project timeline, contractor insurance
  - **Manufacturing**: Equipment inventory, supply chain contracts
- Progress bar showing application completeness
- Status tracker: Draft → Submitted → Under Review → Decision
- Notifications at each status change

### Phase 4: Lender Application Control Panel & Admin Bridge
**Lender queue:**
- Incoming applications with filters (industry, amount, status, corridor)
- Per-application control panel: view certificate + proof chain, vendor history, uploaded docs, Accept/Reject/Request More Info, terms notes
- All status changes trigger vendor notifications

**Admin:**
- Lender KYB review queue
- Cross-department alerts on KYB decisions
- Read-only oversight of application stats
- No intervention in vendor-lender negotiations

### Phase 5: Analytics, Messaging, Blockchain Explorer & Sandbox
**Analytics:** Industry heatmap, corridor analysis, vendor reliability scoring, portfolio trends — all 115+ jurisdictions

**Messaging:** Thread-isolated, real-time badges, 7-year retention, no admin middleman

**Blockchain explorer:** Embedded in certificate detail view, read-only proof chain

**Sandbox:** Mock lender demo at `/trustlock/sandbox/lender-overview`

### Wiring & Testing
- Edge function curl tests per phase
- RLS policy verification
- Notification trigger validation
- Cross-role access testing
- Security scan after schema changes
