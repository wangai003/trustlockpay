
## 1. Dynamic Processor Fee Display
Both SandboxCheckout and WidgetCheckout hardcode "Stripe 2.9%". Fix:
- Import `selectProcessor`, `PROCESSORS` from feeEngine
- Determine processor based on buyer's region (use geolocation or a country selector)
- Display actual processor name and rate dynamically
- Add a buyer country/region selector to both checkouts

## 2. Dual-Mode Payment UI (Africa / International)
Add Africa/International toggle before payment method selection:
- **Africa**: Shows Mobile Money, Bank Transfer, USDC, USDT
- **International**: Shows Card (Stripe), Bank Transfer, USDC, USDT
- Processor auto-adjusts based on mode selection
- Add to both SandboxCheckout (Step 6) and WidgetCheckout (form step)

## 3. Crypto + Taxes/Tariffs
Even when crypto direct (0% processor), taxes & tariffs still apply:
- Both checkouts should show a "Taxes & Tariffs" line item
- In sandbox: show placeholder "Varies by corridor"
- In widget: call `tax-resolve` when buyer country is known
- Add remittance tax note when applicable

## 4. Multi-Vendor Platform API (Widget SDK)
Add support for URL params that platforms like Amazon can pass:
- `product_name`, `product_price`, `product_id`, `vendor_ref`, `category`
- Widget auto-fills from these params, making fields read-only
- Document this in a new `WidgetSDKDocs` section
- Update `checkout-widget` edge function to accept marketplace metadata
