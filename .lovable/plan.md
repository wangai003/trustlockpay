
## Trade-Adaptive Fee Infrastructure — 6-Part Upgrade

> See `.lovable/plan-fee-infrastructure.md` for full details (unchanged from prior).

---

## Lender Portal — Complete Implementation Plan (Final v3)

### Pre-Requisites & Decisions Locked In
- **Hybrid Encryption Model**: E2E for all peer DMs, server-side AES-256-GCM at rest for admin channels
- **Hard Logo Gate**: Lenders blocked from dashboard until logo uploaded
- **Auto-Bridging**: Vendor lender lookup auto-populates from `user_roles` + `lender_profiles`
- **Mandatory Logo**: Displayed in vendor-side lender lookup alongside institution name, verified badge, operating regions
- **Single Lender AI**: One combined assistant ("Oba") handles research, document forensics, AND platform Q&A — no separate Veridia

---

### Phase 1: Database Schema & Auth Foundation

**1A. Lender Role & Profile**
- Add `'lender'` to `app_role` enum
- `lender_profiles` table: `user_id`, `institution_name`, `lending_license_number`, `license_jurisdiction`, `operating_regions` (text[]), `facility_limit` (numeric), `sector_focus` (text[]), `logo_url` (mandatory), `institution_type` (bank/microfinance/dfi/private_lender/cooperative), `website_url` (mandatory), `social_links` (jsonb — optional Facebook/LinkedIn/X/other), `bio`, `kyb_status`, `is_verified`, `status`, `terms_template` (jsonb), `lender_tier` (see 1E)
- `lender-assets` storage bucket (private, RLS: lender uploads to own `user_id/` path)
- RLS: Lenders CRUD own profile; vendors SELECT verified lenders only; admins SELECT all

**1B. Financing Application Tables**
- `financing_applications`: `id`, `vendor_id`, `lender_id`, `certificate_id`, `transaction_id`, `requested_amount`, `proposed_terms` (jsonb), `status` (draft/submitted/under_review/approved/rejected/withdrawn/returned), `lender_notes`, `vendor_notes`, `lender_decision_note` (reason for rejection/return), `approved_amount` (nullable — final approved amount, may differ from requested), `decision_at`, timestamps
- `financing_application_documents`: `id`, `application_id`, `document_type`, `file_url`, `file_name`, `file_type` (jpeg/pdf), `uploaded_by`, `created_at`
- Industry-specific required document types in `lenderDocumentRules.ts`
- RLS: Vendor sees own apps; lender sees apps addressed to them; admin sees all

**1C. Lender KYB Queue & Tiered Verification**
- `lender_kyb_queue`: `id`, `lender_id`, `submitted_documents` (jsonb), `status` (pending/under_review/approved/rejected), `reviewed_by`, `review_notes`, `approved_tier`, timestamps
- RLS: Lender INSERT/SELECT own; admin SELECT/UPDATE all

**1D. Notification Triggers (DB-level)**
- `financing_applications` status change → notify vendor AND lender
- `lender_kyb_queue` status change → notify lender
- New `lender_profiles` row → notify admin Compliance department
- Certificate approaching 90-day expiry → notify lender
- **Vendor order cancellation/rejection → notify ALL lenders with active financing against that vendor** (see Phase 7A)

**1E. Lender Tiers**
- Tier system based on KYB verification depth and institutional capacity:
  - **Tier 1 — Micro-Lender**: Max facility ≤ $50,000. Simplified KYB (business registration + license only)
  - **Tier 2 — Standard Lender**: Max facility ≤ $500,000. Full KYB (registration, audited financials, regulatory license, AML policy)
  - **Tier 3 — Institutional Lender**: Max facility ≤ $5,000,000. Enhanced KYB (all Tier 2 + board resolution, capital adequacy proof, external audit report, insurance coverage)
  - **Tier 4 — DFI / Sovereign**: Unlimited. Custom KYB negotiated with TrustLock compliance team
- Tier determines: max single-loan amount, max concurrent exposure, required KYB documents, dashboard analytics depth
- Admin assigns tier upon KYB approval; lender can apply for tier upgrade

---

### Phase 2: System-Wide Hybrid Encryption

**2A. Encryption Key Infrastructure**
- `encryption_keys` table: `user_id` (UNIQUE), `public_key` (X25519), `key_version`, timestamps
- On signup: client generates X25519 keypair → public key stored in DB, private key in IndexedDB
- Platform AES-256-GCM master key as Supabase secret (`PLATFORM_ENCRYPTION_KEY`)

**2B. E2E Encryption — Peer DMs**
- Applies to ALL peer-to-peer: buyer↔vendor, vendor↔lender, buyer↔lender
- Flow: Sender fetches recipient public key → X25519 ECDH → AES-256-GCM encrypt → INSERT → recipient decrypts
- Columns: `is_encrypted`, `encryption_version`, `sender_public_key_id`

**2C. Server-Side Encryption at Rest — Admin Channels**
- Applies to: `admin_direct_messages.body`, `admin_dept_chat_messages.body`, admin client inbox messages
- `encrypt-message` edge function for AES-256-GCM using `PLATFORM_ENCRYPTION_KEY`
- Columns: `is_encrypted`, `encryption_version`

**2D. Migration Path**
- Existing messages remain unencrypted (`is_encrypted = false`)
- New messages use encryption (`is_encrypted = true, encryption_version = 1`)

---

### Phase 3: Lender Dashboard & Onboarding

**3A. Auth Flow**
- `/trustlock/lender/signup` — email + password with `role: 'lender'` + Google OAuth
- `/trustlock/lender/login` — standard auth
- `LenderLayout.tsx` with `LenderSidebar` and `LenderHeader`
- **Hard Gate** (`LenderOnboardingGate`): blocks all routes until `logo_url` exists

**3B. Mandatory Profile Setup (First-Time Only)**
1. Upload logo (REQUIRED — no bypass)
2. Institution name, type, license details
3. Website URL (MANDATORY)
4. Social links (optional: Facebook, LinkedIn, X)
5. Operating regions (multi-select from 115+ corridors)
6. Sector focus (multi-select from 25 industries)
7. Bio/description
8. On completion → `lender_profiles` row created with `kyb_status: 'pending'` → `lender_kyb_queue` auto-created → admin notified

**3C. Lender Dashboard Pages**
- **Overview**: Portfolio metrics (active certificates, total exposure, completion rates, avg days-to-release), tier badge
- **Portfolio / Certificates**: Browse escrow certificates with status, amounts, industries, blockchain proof chain
- **Applications**: Incoming financing requests with full control panel (see Phase 5A)
- **Vendor Lookup**: Browse verified vendors (same lookup pattern)
- **Messages**: E2E encrypted messaging with vendors
- **Blockchain Explorer**: Read-only `BlockchainExplorerPanel`
- **Documents**: KYB docs, generated contracts, compliance records, **liability contract archive**
- **Analytics**: Portfolio performance, sector concentration, geographic exposure (depth gated by tier)
- **Oba AI**: Combined lender intelligence assistant (research + document forensics + platform Q&A)
- **KYB Verification**: Upload/manage KYB documents, view tier status, apply for tier upgrade
- **Settings**: Profile management, logo update, website (mandatory), social links, terms template, notifications

**3D. Lender Sidebar Navigation Order**
1. Overview
2. Portfolio
3. Applications
4. Vendor Lookup
5. Messages
6. Documents
7. Blockchain Explorer
8. Analytics
9. Oba AI
10. KYB Verification
11. Settings

---

### Phase 4: Vendor-Side Financing Integration

**4A. Vendor Sidebar — "Lender Lookup" (Auto-Bridged)**
- `/trustlock/vendor/lender-lookup`
- Same `UserLookupFilters` + `UserLookupCard` pattern
- Displays: logo, institution name, operating regions, sector focus, verified badge, tier badge, website link
- Auto-updates when new lender gets KYB-approved

**4B. Vendor Sidebar — "Request Financing" & Application Lifecycle**
- Application wizard: select certificate → select lender → upload industry-specific docs (JPEG or PDF) → propose terms → submit
- Progress bar: Draft → Submitted → Under Review → Decision

**Vendor Application Actions:**
- **Submit**: Initial submission to selected lender
- **Withdraw**: Vendor can withdraw application at any point before final decision (status → `withdrawn`)
- **Review & Update** (after lender returns): If lender returns the application for revision, vendor receives notification → opens application in edit mode → can update items, upload additional documents (JPEG/PDF), modify notes → resubmit
- **Reconfirm Submission**: After making changes on a returned application, vendor explicitly reconfirms before resubmission (confirmation dialog)
- **Status Check**: Real-time status indicator always visible — Draft / Submitted / Under Review / Returned for Revision / Approved / Rejected / Withdrawn

Notifications at every status transition.

**4C. Vendor Social/Website Requirement (NEW)**
- **New signups**: Signup form adds mandatory field: website URL OR at least one social media link (Facebook, LinkedIn, X)
- **Existing accounts**: On login, check if `profiles.website_url` is null AND `profiles.social_links` is empty → trigger notification in Settings: "Update your account: add a website or social media link to maintain active status"
- `profiles` table additions: `website_url` (text, nullable), `social_links` (jsonb — `{facebook?: string, linkedin?: string, x?: string}`)
- Settings page: editable website + social links section
- Enforcement: soft gate via persistent notification + badge on Settings sidebar item (not blocking)

**4D. Itemized Loan Application (Invoice-Powered)**
- Vendors requesting financing fill out an **itemized application** that mirrors the existing `InvoiceFeeCalculator` and `feeEngine` logic:
  - Line-item builder: description, quantity, unit price (USD), category (goods/services/materials/equipment/transport)
  - Each line auto-calculates: subtotal, applicable tax (via `tax-resolve` engine using vendor + buyer country corridor), currency conversion to vendor's local currency
  - **Dual-currency display**: USD (for escrow/lending settlement) alongside vendor's local currency equivalent (using `globalCurrencies.ts` registry rates)
  - Running totals: subtotal, total taxes/tariffs, total requested amount
  - Tax breakdown component reuses `TaxBreakdown` for per-line and aggregate tax/tariff visibility
  - Industry-aware: auto-suggests common line items based on vendor's industry (e.g., "Raw Materials", "Freight CIF", "Customs Clearance" for mining/agriculture)
- `financing_application_items` table: `id`, `application_id`, `description`, `quantity`, `unit_price_usd`, `category`, `tax_amount`, `local_currency_code`, `local_currency_amount`, `exchange_rate_snapshot`, `sort_order`, timestamps
- RLS: same as `financing_applications` — vendor owns, lender reads assigned, admin reads all
- Lender sees the full itemized breakdown when reviewing applications — gives granular visibility into what funds cover
- Generated contract PDF includes the itemized schedule as an appendix
- Exportable: vendor and lender can download/print the itemized application as a standalone summary PDF (via `generate-pdf` engine)

**4E. Vendor Sidebar Navigation — Updated Order**
1. Overview
2. Lender Lookup
3. Request Financing (prominent)
4. Orders
5. Buyer Lookup
6. Messages
7. Documents
8. (remaining existing items)

---

### Phase 5: Lender Control Panel & Admin Integration

**5A. Lender Application Processing**
- Incoming queue with filters (industry, amount, status, corridor, tier)
- Per-application control panel: view certificate + blockchain proof, vendor history, uploaded docs, full itemized breakdown

**Lender Application Actions:**
- **Approve**: Approve application with final approved amount (may differ from requested). Includes optional note. Status → `approved`. System auto-logs disbursement to lender analytics (assumes vendor received funds offline).
- **Reject**: Reject application with mandatory `lender_decision_note` explaining reason. Status → `rejected`. Vendor notified with rejection reason.
- **Return for Revision**: Lender finds discrepancy or missing info → returns application to vendor with note explaining what needs fixing. Status → `returned`. Vendor gets notified, can edit and resubmit without starting over.
- **Review & Update within Application**: Lender can annotate/flag specific line items or documents within the application view before making a decision.

All status changes trigger vendor notifications.

**5B. Auto-Disbursement Logging (Status-Driven)**
- When lender approves a financing application:
  1. `financing_applications.status` → `approved`, `approved_amount` set
  2. System automatically creates a `lender_disbursement_records` entry with:
     - `source: 'auto'`
     - `amount_usd`: the approved amount
     - `status: 'confirmed'` (no manual confirmation needed — approval IS the confirmation)
     - `vendor_id`: linked from the application
  3. This auto-populates the lender analytics dashboard — no separate proof upload required
- Lenders can ALSO manually log additional offline disbursements if needed (manual entry form still available)

**5C. Contract Generation**
- `generate-lender-contract` edge function (jsPDF)
- Inputs: lender logo (letterhead/seal), financing terms, certificate data, milestone schedule, governing law
- Output: Professional PDF with lender logo, milestone-linked repayment triggers, dual-signature blocks, governing law clause
- Auto-archived in `protection-documents` with 7-year retention + blockchain anchor

**5D. Admin KYB Review**
- Admin page: `/trustlock/admin/lender-kyb`
- Review submitted KYB documents, assign tier, approve/reject with notes
- On approval → `is_verified = true`, tier assigned → lender appears in vendor lookup
- Cross-department alert from Compliance to Executive on each decision

**5E. Offline Repayment Workflow**
- Milestone release → auto-generated "Repayment Due Notice" PDF
- Vendors log "Offline Repayment Confirmation" with proof upload
- Lender acknowledges/disputes confirmation
- Full audit trail logged

---

### Phase 6: Oba AI — Combined Lender Intelligence Assistant

**6A. Identity & Purpose**
- Name: **Oba** (meaning "ruler/leader" in Yoruba — fitting for financial oversight)
- Role: **Single combined 24/7 AI assistant** for lenders — handles ALL lender AI needs:
  1. **Vendor Research & Due Diligence** (formerly Oba-only)
  2. **Document Authenticity Analysis** (formerly Veridia)
  3. **Platform Q&A** — soft inquiries about TrustLock safety protocols, how escrow works, platform security measures, dispute resolution process, any non-sensitive operational questions
- Differentiation from other assistants:
  - **Amani** (buyer): consumer protection, order tracking, delivery guidance
  - **Zawadi** (vendor): sales optimization, fulfillment, payout guidance
  - **Emmanuel** (admin): compliance, disputes, platform-wide strategy
  - **Oba** (lender): creditworthiness, document forensics, industry research, portfolio risk, vendor due diligence, TrustLock platform Q&A

**6B. Research & Due Diligence Capabilities**
1. **Vendor Due Diligence**: Query TrustLock database for vendor completion rates, average days-to-release, dispute history, order volume trends, KYC/KYB status, industry classification
2. **Industry Intelligence**: Deep knowledge of all 25 supported industries — typical margins, seasonal patterns, common risks, regulatory requirements per corridor
3. **External Research**: Leverage web search (via Lovable AI) to find publicly available company information — registration records, news mentions, social media presence, industry reputation
4. **Portfolio Risk Analysis**: Analyze lender's current exposure by sector, corridor, and vendor concentration; flag over-concentration risks
5. **Financing Application Review**: Summarize application details, compare against vendor's track record, flag discrepancies or red flags
6. **Regulatory Guidance**: Provide corridor-specific lending regulations, cross-border compliance requirements, and reporting obligations
7. **Repayment Tracking Intelligence**: Monitor milestone releases linked to financed transactions, alert on delayed milestones, calculate projected repayment timelines

**6C. Document Authenticity Analysis Capabilities (Integrated)**
Oba includes all document forensics capabilities (formerly Veridia), triggered when lender uploads/attaches a document for analysis:

1. **Multi-Dimension Authenticity Scoring** (percentage-based confidence):
   - **Visual Consistency** (15%): Font uniformity, alignment, layout professionalism, resolution quality
   - **Registration Markers** (15%): Presence of official stamps, seals, registration numbers, barcodes, QR codes
   - **Date & Expiry Validation** (10%): Logical date sequences, expiry not passed, issue dates consistent with document age
   - **Issuer Verification** (15%): Cross-reference issuer name/logo against known templates for that document type and jurisdiction
   - **Content Coherence** (15%): Internal consistency — names match across pages, amounts align, no contradictions
   - **Metadata Analysis** (10%): File creation date vs claimed issue date, editing tool signatures, compression artifacts
   - **Jurisdictional Compliance** (10%): Document format matches expected format for claimed country/region
   - **Tampering Indicators** (10%): Pixel-level anomaly detection for cut/paste artifacts, font mismatches, color inconsistencies

2. **Composite Confidence Score**: Weighted average across all dimensions:
   - **90–100%**: ✅ High Confidence — "Document appears authentic with strong indicators"
   - **70–89%**: ⚠️ Moderate Confidence — "Document shows some concerns, manual verification recommended"
   - **50–69%**: 🔶 Low Confidence — "Significant anomalies detected, further investigation strongly advised"
   - **Below 50%**: 🚨 Very Low Confidence — "Multiple red flags detected, proceed with extreme caution"

3. **Live Analysis Progress**: While analyzing, Oba streams progress updates for each dimension

4. **Post-Analysis Output**: Summary card, dimension breakdown, key observations, methods disclosure, **mandatory due diligence reminder**

**6D. Platform Q&A Capabilities (NEW)**
- Oba answers soft inquiries about TrustLock including:
  - How escrow protection works
  - Safety protocols and security measures
  - Dispute resolution process overview
  - How milestones and releases work
  - Platform compliance and regulatory posture
  - How lender certificates are generated and verified
  - General platform FAQs
- **Boundary**: Oba will NOT disclose internal architecture, database schemas, fee formulas, or proprietary logic (same confidentiality protocol as other assistants)

**6E. Tool Calling (Edge Function)**
- `oba-chat` edge function with 8+ analytical tools:
  - `vendor_profile_lookup` — fetch vendor's TrustLock history, completion rate, dispute ratio, volume
  - `portfolio_exposure` — lender's current sector/corridor/vendor concentration
  - `industry_risk_brief` — industry-specific risk factors, typical margins, seasonal patterns
  - `application_summary` — structured summary of a financing application
  - `external_company_search` — web search for public company information (news, registration, social)
  - `milestone_tracker` — status of milestones on financed transactions
  - `repayment_projection` — projected repayment dates based on milestone schedule
  - `document_authenticity_report` — structured authenticity scoring output for uploaded documents

**6F. Security & Confidentiality Protocol**
- Same hardened security as Amani/Zawadi/Emmanuel:
  - Server-side role verification: JWT validated against `user_roles` table, must have `lender` role
  - Rate limiting: 10 queries/minute per user
  - Conversation context cap: 50 messages
  - Prompt injection filtering: 15+ regex patterns
  - **Strict IP protection**: Never disclose database schemas, table names, API paths, fee formulas, risk scoring thresholds, fraud detection patterns, wallet addresses, or internal architecture
  - Never reveal information about OTHER lenders' portfolios or terms
  - Lender can only query vendors who have PUBLIC profiles or are in active transactions with them

**6G. Oba UI Design — Distinctive Visual Identity**
- **Card Container**: Dark-green blended border (`border-emerald-700/60`) with subtle gradient glow effect
- **Interior**: Clean white/light background (`bg-white dark:bg-slate-950`) — high contrast for readability
- **Header**: Oba name + custom avatar (crown/brain icon with emerald accent) + tagline "Your Lending Intelligence Advisor"
- **Welcome Message**: Brief greeting + short summary of capabilities: research, document analysis, platform Q&A
- **Accent Color**: Emerald-green (`emerald-600/700`) instead of primary blue — differentiates from Amani/Zawadi
- **Document Analysis Mode**: When a document is uploaded, Oba switches to analysis mode with:
  - Large circular confidence gauge with animated fill on completion
  - Emerald-themed step indicators for each analysis dimension
  - Score display with color-coded badges
- **Message Bubbles**: User messages in emerald tint, Oba's responses in white with thin emerald-left-border
- **Quick Action Cards**: "Analyze Vendor", "Check Document", "Review Application", "Portfolio Risk Check", "Industry Brief", "Platform FAQ"
- **Overall Feel**: Professional forensics-lab aesthetic — clean, precise, trustworthy

**6H. Analysis History**
- `oba_document_analyses` table: `id`, `lender_id`, `document_name`, `document_type`, `confidence_score`, `dimension_scores` (jsonb), `findings_summary`, `created_at`
- Lenders can view past analyses in Documents section
- RLS: lender sees only own analyses; admin sees all

---

### Phase 7: Lender Notification Rewiring & Risk Awareness

**7A. Vendor Cancellation/Rejection → Lender Notification**
- When a vendor cancels or rejects an order:
  1. Existing: notify admin + buyer
  2. **NEW**: Query `financing_applications` for ANY active/approved financing linked to that vendor
  3. For each linked lender → send notification:
     - Type: `warning`
     - Title: "⚠️ Financed Vendor Order Cancelled/Rejected"
     - Body: "Vendor [name] cancelled/rejected order [tx_id] ($[amount]). You have active financing exposure to this vendor. Review your portfolio."
     - Action URL: link to portfolio/vendor detail
  4. If vendor has 3+ cancellations in 30 days → escalate to `critical` severity + admin cross-department alert to Finance

**7B. Lender Risk Dashboard Signals**
- Real-time risk indicators on lender Overview:
  - Vendor cancellation rate (30/60/90 day windows)
  - Overdue milestone alerts on financed transactions
  - Concentration risk warnings (>40% exposure to single vendor/sector/corridor)
  - KYC/compliance hold alerts on financed transactions

---

### Phase 8: Liability Contract & Legal Enforcement

**8A. TrustLock/Azix Liability Contract**
- Professional legal document protecting TrustLock and its affiliate (Azix)
- Design specifications:
  - **Header**: Official TrustLock logo (shield) as letterhead
  - **Watermark**: Patented TrustLock watermark (diagonal, semi-transparent) on every page
  - **Content**: Liability limitations, dispute resolution terms, platform usage terms, data handling, indemnification clauses
  - **Signature section**:
    - Signature field (drawn or typed)
    - "Name" field (auto-filled from profile)
    - "Title/Position" field (required — e.g., "CEO", "Lending Officer", "Managing Director")
    - "Date" field (auto-filled)
    - "On behalf of" field (auto-filled from institution name)
  - Footer: Document ID, version, generation timestamp

**8B. Enforcement — First-Time Overlay**
- After lender completes signup + profile setup + KYB submission:
  - Full-screen overlay displays the Liability Contract
  - Cannot be dismissed without signing
  - Clear explanation panel: "Why this matters" + "Where to find it later" (Documents → Liability Contract)
  - After signing → contract auto-archived in:
    1. Lender's Documents section
    2. Admin's compliance records
    3. `protection-documents` bucket with 7-year retention
  - Blockchain proof anchor for the signed contract

**8C. Contract Versioning**
- `liability_contracts` table: `id`, `user_id`, `role` (lender), `version`, `signed_at`, `signature_data` (jsonb), `signatory_title`, `ip_address`, `user_agent`, `pdf_url`, `blockchain_proof_id`
- If TrustLock updates the contract, existing lenders see a new overlay on next login requiring re-signing of updated version

---

### Phase 9: Vendor Social/Website Enforcement

**9A. Database Changes**
- Add to `profiles` table: `website_url` (text, nullable), `social_links` (jsonb, nullable)
- Social links schema: `{ facebook?: string, linkedin?: string, x?: string }`

**9B. Signup Flow Update**
- VendorSignup: Add section after entity type selector:
  - "Website URL" input (optional if social provided)
  - "Social Media" section with Facebook, LinkedIn, X input fields
  - Validation: at least ONE of (website OR any social link) must be provided
  - Label: "Required for vendor verification and lender due diligence"

**9C. Existing Account Enforcement**
- On authenticated session start, check if vendor profile has no website AND no social links
- If missing → create notification: "Complete your profile: Add a website or social media link to maintain full account access"
- Settings page: persistent banner until at least one link is added
- Badge on Settings sidebar item showing pending update

**9D. Lender Signup — Website & Social**
- Lender profile setup: `website_url` is MANDATORY (required field, cannot skip)
- Social links: optional but encouraged (Facebook, LinkedIn, X)
- Displayed in lender lookup cards and contract headers

---

### Phase 10: Analytics Hub, Sandbox & Final Wiring

**10A. Lender Analytics Hub — Full Financial Intelligence**

*Data Ingestion (3 Sources):*
1. **Auto-captured**: All on-platform escrow releases, milestone completions, repayment confirmations, and financing application outcomes (approval → auto-log disbursement) are automatically ingested into analytics
2. **Manual Entry**: Lenders can manually log additional offline fund disbursements via a quick-entry form: recipient vendor, amount (USD + local currency), disbursement date, reference number, notes
3. **Document Upload → AI Extraction**: Lenders upload disbursement letters, bank transfer confirmations, or payment receipts. The system uses Gemini Vision AI to extract: amount, date, recipient, reference number, currency — then auto-populates a `lender_disbursement_records` entry for lender review/confirmation before committing

*`lender_disbursement_records` table*: `id`, `lender_id`, `vendor_id` (nullable — linked if vendor exists in TrustLock), `application_id` (nullable — linked if from auto-log), `amount_usd`, `local_currency_code`, `local_currency_amount`, `exchange_rate_snapshot`, `disbursement_date`, `reference_number`, `source` (auto/manual/document_extract), `document_url` (nullable), `extraction_confidence` (nullable — AI confidence %), `status` (pending_review/confirmed/rejected), `notes`, timestamps
- RLS: lender CRUD own; admin SELECT all

*Dashboard Analytics Panels:*
- **Total Funds Disbursed**: aggregate by month/quarter/year, on-platform vs offline, with trend charts
- **Portfolio Performance**: completion rates by industry/corridor/vendor, average days-to-release, default/cancellation rates
- **Sector Concentration**: pie/donut chart with threshold alerts (>40% single sector = warning)
- **Geographic Exposure**: map/table view across 115+ jurisdictions
- **Facility Utilization**: current exposure vs tier max, remaining capacity gauge
- **Vendor Risk Scorecard**: per-vendor summary — total lent, repayment rate, active orders, cancellation history
- **Repayment Tracking**: expected vs actual repayment timeline, overdue amounts highlighted
- **Currency Exposure**: breakdown of disbursements by currency with USD equivalents

*Reports & Export:*
- **Downloadable Summary Reports**: Lenders can generate and download/print PDF reports for any time period covering:
  - Portfolio summary (total disbursed, outstanding, recovered, write-offs)
  - Per-vendor lending history with repayment status
  - Sector/corridor breakdown
  - Tax implications summary (aggregate taxes from itemized applications)
  - Risk assessment summary
- Report generation via `generate-pdf` edge function with lender logo as letterhead
- CSV export option for raw data (disbursements, applications, repayments)
- Tier-gated depth: Tier 1 sees basic totals + top-3 vendors; Tier 2 adds sector/corridor charts; Tier 3+ gets full analytics + risk scorecards + custom date ranges

**10B. Sandbox Demo**
- `/trustlock/sandbox/lender-overview` with mock lender dashboard
- Pre-populated portfolio data, sample certificates, demo financing applications
- 8+ mock lender profiles in sandbox data for vendor lookup demo
- Mock Oba AI chat with pre-scripted responses (including document analysis demo + platform Q&A demo)
- Mock liability contract signing flow
- Mock KYB verification with tier assignment demo

**10C. Final Security Audit**
- RLS policy verification for all new tables
- Encryption key rotation mechanism tested
- Cross-role access testing
- Notification trigger validation
- Security scan after all schema changes
- Input validation on all edge functions (Zod schemas)
- Oba AI confidentiality protocol verification (research, forensics, AND platform Q&A modes)
- Document analysis history RLS verification

---

### Security Checklist
- [ ] All new tables have RLS enabled with proper policies
- [ ] `lender` role added to `app_role` enum
- [ ] Lender data isolated via RLS (own-data access only)
- [ ] KYB approval required before vendor-facing visibility
- [ ] Logo upload MANDATORY before dashboard access (hard gate)
- [ ] Website MANDATORY for lender profiles
- [ ] Hybrid encryption deployed across ALL message channels
- [ ] E2E keys generated on signup, public keys in DB, private keys client-side only
- [ ] Admin channels use server-side AES-256-GCM at rest
- [ ] Financing contracts auto-archived with 7-year retention + blockchain anchor
- [ ] Liability contract enforced as overlay, archived on admin + lender side
- [ ] Notification triggers on ALL status transitions (financing apps, KYB, messages, cancellations)
- [ ] Vendor cancellation/rejection → lender notification rewiring complete
- [ ] Vendor social/website requirement enforced (new + existing accounts)
- [ ] Lender tiers implemented with KYB-gated max facility limits
- [ ] Oba AI hardened with confidentiality protocol (same standard as Amani/Zawadi/Emmanuel)
- [ ] Oba document forensics integrated with 8-dimension scoring + mandatory due diligence disclaimer
- [ ] `oba_document_analyses` stored with lender-only RLS
- [ ] Confidence scoring calibrated with transparent methodology disclosure
- [ ] No raw SQL or user-provided SQL in edge functions
- [ ] Auto-bridging verified: new verified lender instantly appears in vendor lookup
- [ ] Lender logo displayed in all lookup cards and contract headers
- [ ] Sandbox demo includes lender features + Oba mock (research + forensics + Q&A) for presentation readiness
- [ ] `lender_disbursement_records` RLS: lender CRUD own, admin SELECT all
- [ ] Auto-disbursement logging on application approval verified
- [ ] `financing_application_items` RLS: vendor owns, lender reads assigned, admin reads all
- [ ] Itemized application dual-currency calculations verified against `globalCurrencies.ts` rates
- [ ] PDF export for lender financial reports includes logo letterhead + watermark
- [ ] CSV export sanitized — no internal IDs or sensitive metadata exposed
- [ ] Application lifecycle (submit/withdraw/return/resubmit/approve/reject) fully tested
- [ ] Lender return-for-revision flow: vendor receives notification, can edit + upload additional docs, resubmit
