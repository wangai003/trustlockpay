# Pilot Test Playbook PDF — Domestic (M-Pesa) + International (Visa→Kenya)

I'll generate a single, well-structured PDF using ReportLab and deliver it via `/mnt/documents/`. No app code changes — this is a strategy/operations document for the Azix Team to run the first two real-world TrustLock pilots.

## Cover & Document Setup
- Cover page: "TrustLock Pilot Test Playbook — Domestic & International E-Commerce"
- Subtitle: Pilot Readiness, Execution & Testnet→Mainnet Transition Roadmap
- Prepared by: **Azix Team** · Date: **May 4, 2026** · Version 1.0 · Confidential
- Deep-emerald institutional palette matching TrustLock brand

## Document Structure (sections, in order)

**1. Executive Summary** — what these two pilots prove, success criteria, go/no-go gates.

**2. Pilot Scenarios Defined**
   - **Pilot A — Domestic Kenya:** Nairobi buyer pays a Nairobi e-commerce vendor in KES via **M-Pesa STK Push** → settled in USDC escrow → released to vendor M-Pesa wallet
   - **Pilot B — International:** US buyer pays a Kenyan vendor via **Visa card (USD)** → USDC escrow → physical shipment Nairobi→US → release on delivery confirmation
   - Why these two: covers both rails (mobile money + card), both directions (domestic + cross-border), both fulfillment types (digital/instant + physical/shipped)

**3. Pre-Flight Gaps to Close (from prior audit)**
   - Patch `verify-crypto-payment` for testnet branch (Amoy USDC address, testnet inbound wallet)
   - Confirm `AZIX_WALLET` placeholder is replaced with real testnet treasury wallet
   - Add wallet-address field to vendor payout-method UI for `direct_crypto`
   - Build one-shot smoke-test edge function (full Amoy lock→release→payout in one click)
   - For Pilot A: wire **M-Pesa Daraja API** keys (sandbox first) — currently routes via Transak fallback
   - For Pilot B: wire **Stripe** test keys (publishable + secret) for card capture
   - For both: confirm Transak sandbox key for fiat→USDC on-ramp OR use direct USDC funding of buyer testnet wallet
   - KYC threshold: keep both pilot transactions under $5,000 to skip post-escrow KYC hold
   - Vendor payout: domestic = M-Pesa B2C disbursement; international = USDC to vendor wallet (vendor self-converts via Binance P2P / Yellow Card)

**4. Account Creation Strategy — Testnet vs Mainnet**
   - Recommendation: **Single account, environment toggle** (already built — `isTestnet` in BuyerContext/VendorContext/AdminContext)
   - Pilot participants create normal accounts on production URL → flip the testnet toggle → all transactions hit Amoy contracts + testnet USDC
   - Zero data migration needed when switching to mainnet — same account, toggle off
   - Buyer account: regular signup (Google OAuth)
   - Vendor account: signup + KYC-lite (entity classification, payout wallet, business profile)

**5. Widget vs Standalone Links — Recommended Coverage**
   - Run **both** in parallel to test both surfaces:
     - **Standalone link** — for Pilot A vendor (likely no website, common in Kenyan SME e-commerce)
     - **Embeddable widget** — for Pilot B vendor (international vendor with Shopify/WooCommerce store)
   - Tests functional parity (memorized as a project rule) and gives real conversion data on each surface

**6. Pilot Items & Transaction Sizes**
   - **Pilot A (Domestic):** Handwoven Kiondo bag — KES 2,500 (~$19) · or Maasai beaded sandals KES 1,800 (~$14) · low ticket = low risk
   - **Pilot B (International):** Kenyan single-origin coffee 1kg + branded mug bundle — $45 + $35 shipping = $80 · physical, shippable, customs-light
   - Keep both under $100 for first run; scale to $500 after 3 successful runs

**7. Data Collection Matrix** (per transaction)
   - **Funnel:** widget impression → checkout open → payment method selected → payment initiated → escrow locked → milestone marked → release triggered → vendor receives
   - **Timing:** time-to-lock, time-to-ship (Pilot B), time-to-confirm, time-to-payout
   - **Financial:** gross amount, processor fee, TrustLock 0.5% upfront, 1.0% deferred, gas reserved, gas actually spent, net to vendor
   - **Compliance:** KYC tier triggered, IP triple-match result, OFAC screen result, GPS captured (Pilot B only — physical goods)
   - **UX:** drop-off step, time-on-checkout, support tickets opened, dispute filed Y/N
   - **Blockchain:** txHash for inbound, escrow lock txHash, release txHash, anchor batch ID
   - **Vendor side:** notification latency, payout confirmation latency, dashboard accuracy

**8. Blockchain Recording — What Gets Anchored on Testnet**
   - **Yes** — every testnet transaction is recorded on Polygon Amoy: escrow lock, release, refund, dispute resolution all hit the contract
   - Document hash chain (SHA-256) is anchored every 15 min via batched cron (per project memory)
   - Lender certificates skipped for pilot
   - Testnet anchors are real on-chain proof but have no economic value

**9. Testnet → Mainnet Transition Roadmap**
   - **Phase 0 (Now → Week 1):** Close 7 gaps in section 3, run smoke-test edge function
   - **Phase 1 (Week 2):** Internal dry run on Amoy — Azix team plays buyer + vendor for both pilots
   - **Phase 2 (Week 3-4):** External pilot — 1 real Kenyan vendor + 5 friendly buyers (3 domestic, 2 US) on **testnet** with real M-Pesa sandbox + Stripe test mode
   - **Phase 3 (Week 5):** Review data, fix bugs, second testnet round if needed
   - **Phase 4 (Week 6):** Mainnet readiness checklist — production secrets (M-Pesa prod, Stripe live, Transak prod), mainnet contract deployment, gas treasury funded with real POL, OFAC live, KYC vendor live (Onfido/Veriff), terms of service signed by all participants, insurance/liability review
   - **Phase 5 (Week 7):** Mainnet pilot — same 2 transactions but real money, capped at $50 each
   - **Phase 6 (Week 8+):** Scale to 10 vendors, raise caps to $500, monitor

**10. Other Sectors to Pilot (after e-commerce proves out)**
    - **Freelance / professional services** — digital, no shipping, fast feedback loop, low compliance burden
    - **Tourism & hospitality** — Kenyan safari deposits from international tourists, high-trust use case
    - **Agriculture export** — coffee/tea co-ops, milestone-based, GPS-required, showcases TrustLock OS workflow engine
    - **Construction (small)** — site work milestones, demonstrates Gantt + GPS verification
    - Suggested timeframe: e-commerce Q2-Q3 2026 → freelance Q3 → tourism Q4 → agri/construction Q1 2027

**11. Risk Register & Mitigations**
    - Vendor doesn't get paid → manual admin override path documented
    - Card chargeback after USDC released → 90-day chargeback window, hold release for international until day 8
    - M-Pesa reversal → reconciliation queue
    - Buyer lost wallet access → recovery flow via support
    - Regulatory: CBK (Kenya) + FinCEN (US) status — flag as legal review item

**12. Success Criteria & Sign-Off**
    - Both pilots complete end-to-end with no manual database edits
    - Total fees within disclosed range (2.5–5.9%)
    - Zero loss of funds
    - Vendor payout within 48h of release
    - Data captured for all 7 funnel stages

**13. Appendices**
    - A. Pre-flight checklist (printable)
    - B. Participant onboarding script
    - C. Data collection spreadsheet template (column headers)
    - D. Glossary

## Technical Approach
- Python + ReportLab Platypus (multi-page, styled, tables, TOC)
- Brand colors: deep emerald (#0F3D2E), gold accent (#C9A961), institutional dark
- 30–40 pages, professional layout
- Output: `/mnt/documents/TrustLock_Pilot_Playbook_v1.pdf`
- Mandatory visual QA: convert every page to JPG and inspect for overflow/clipping before delivery
- Versioned filename so revisions become `_v2.pdf` etc.

## Deliverable
Single PDF artifact via `<lov-artifact>` tag. No code changes to the app.
