
## Trade-Adaptive Fee Infrastructure — 6-Part Upgrade

### 1. Incoterms Awareness
- Add `incoterm` field to transactions table (EXW, FOB, CIF, DDP, etc.)
- Create an Incoterms responsibility matrix mapping which party is responsible for each fee category
- Surface responsibility labels in the External Fee Tracker UI
- Add Incoterms selector to checkout flow for international/regional trades

### 2. Multi-Currency Rollups
- Add `base_currency` and `exchange_rate_snapshot` columns to `external_fee_entries`
- Build currency normalization utility converting all fees to escrow base currency
- Display both original currency and normalized amount in fee tracker UI
- Show combined multi-currency summary in milestone panels

### 3. Temporal Fee Classification
- Add `fee_phase` column to `external_fee_entries` (pre_shipment, in_transit, post_arrival, pre_escrow)
- Group fees by phase with collapsible sections
- Auto-suggest phase based on industry template and milestone position

### 4. Admin Escalation Thresholds
- Database trigger when total external fees exceed 30% of escrow value
- Auto-create cross-department alert to Finance + Compliance
- Warning badge in admin transaction views for flagged transactions

### 5. Fee Dispute Resolution Path
- Add `dispute_status` and `dispute_note` columns to `external_fee_entries`
- Mini-resolution flow: Rejected → Disputed → Revised/Withdrawn
- Notify admin if fee disputes remain unresolved for 48+ hours

### 6. Pre-Escrow Fee Logging
- Add `pre_escrow` boolean to `external_fee_entries`
- Allow vendors to log pre-escrow costs during checkout/onboarding
- Roll pre-escrow fees into total cost summary, visually separated

### Migration: Single SQL migration covering all schema changes
### Code: Update ExternalFeeTracker, ExternalFeeSummary, MilestoneWorkOrderPanel, and checkout components
