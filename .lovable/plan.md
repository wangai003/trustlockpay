
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
