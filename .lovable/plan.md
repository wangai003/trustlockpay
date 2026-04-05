## Sandbox Overhaul Plan

### 1. Dummy Vendor Website Hub (`/sandbox/store`)
- Landing page with 5 industry cards: E-Commerce, Real Estate, Mining, Energy, Freelance
- Each card links to `/sandbox/store/:industry` with a mock vendor website page
- Each page has a TrustLock Pay widget button that opens the checkout flow

### 2. Industry Checkout Flow (`/sandbox/checkout/:industry`)
- Pre-filled invoice based on industry (item, price, milestones, documents)
- RFQ bypass — goes straight to invoice review
- Industry-specific document gates shown (view-only)
- Payment method selector (simulated — auto-completes on click)
- Generates confirmation code + order number, shows instructions to copy and go to buyer dashboard

### 3. Shared Order Storage
- Orders stored in `localStorage` keyed by sandbox session
- Both vendor and buyer views read from same store
- Vendor sees ALL orders across 5 industries
- Buyer enters order number to "claim" and track it

### 4. Updated Sandbox Layout
- Remove 24h expiry → show countdown to Dec 31, 2026
- Add "Browse Store" link in sidebar for discovering the dummy websites
- Buyer orders page: add "Enter Order #" field to pull up orders
- Vendor orders page: show all sandbox orders with industry badges

### 5. Milestone Collaboration Flow
- After buyer claims order, both can advance milestones
- Industry-specific milestone steps with document placeholders
- Final stage marks order complete

### Files to create/modify:
- **Create**: `SandboxStore.tsx` (hub), `SandboxStorePage.tsx` (per-industry mock site), `SandboxCheckout.tsx` (checkout flow), `sandboxIndustryData.ts` (invoices/milestones per industry)
- **Modify**: `SandboxLayout.tsx` (sidebar + countdown), `SandboxOrders.tsx` (order lookup), `sandboxData.ts` (shared storage utils), `App.tsx` (routes)
