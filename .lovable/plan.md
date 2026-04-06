
## Marketplace Scale Tooling

### 1. Multi-Vendor Cart Routing
- Update `marketplace-bridge` edge function to accept an `items[]` array where each item has its own `vendor_ref`, `price`, and `product_id`
- Split a single checkout into multiple escrow transactions — one per vendor
- Return a `cart_id` that groups the child transactions
- Update `WidgetCheckout` to render a grouped order summary showing items by vendor
- Add `cart_id` column to `transactions` table for grouping

### 2. Platform Admin Dashboard
- Create a new `platform_api_keys` table to register platforms (Amazon, Jumia, etc.) with their API key hash, name, and settings
- Create a `platform-dashboard` edge function returning aggregate stats (total GMV, active vendors, pending claims, disputes) filtered by platform API key
- Build a new `/trustlock/admin/platforms` page showing registered platforms with their vendor count, transaction volume, and claim token status

### 3. Bulk Vendor Onboarding API
- Add a `POST /marketplace-bridge` action `bulk_onboard` that accepts a CSV-style JSON array of vendor records (name, email, external_ref, industry)
- For each vendor, generate a claim token and store in `vendor_claim_tokens` (new table)
- Return a summary with token URLs the platform can distribute to their vendors
- Add rate limiting (max 500 per request)

### 4. Platform Fee Layering
- Add `platform_fee_percent` column to `platform_api_keys` table
- Update `widget-embed` script to accept `data-platform-fee` attribute
- Update `checkout-widget` and `WidgetCheckout` to read and display the platform commission as a separate line item
- Update `process-payment` to include platform fee in the total and route it to the platform's payout account

### Database Migration (single migration)
- `platform_api_keys` table (id, platform_name, api_key_hash, platform_fee_percent, contact_email, is_active, settings, created_at)
- `vendor_claim_tokens` table (id, platform_id, vendor_external_ref, vendor_name, vendor_email, industry, claim_token, claimed_by, claimed_at, expires_at, created_at)
- Add `cart_id` and `platform_id` columns to `transactions` table
- RLS policies for all new tables
