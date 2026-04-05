
## Multi-Site / Multi-Industry Widget Architecture

### Phase 1: Database Changes
- Add `industry` column to `vendor_sites` table
- Add `site_id` column to `vendor_widget_fees` table (change from per-vendor to per-site tracking)
- Add unique constraint on `(vendor_id, site_id)` in `vendor_widget_fees`

### Phase 2: Widget Fee Logic Updates
- Update `widgetFeeLogic.ts` to accept a `siteId` parameter
- Update `manage-widget-fee` edge function to scope state per site
- Update localStorage keys to be site-scoped

### Phase 3: CRM Sidebar Conditional Visibility
- Update `VendorSidebar.tsx` to only show CRM link when at least one vendor site has an RFQ-enabled industry
- Query `vendor_sites` joined with `industry_templates` to determine visibility

### Phase 4: Vendor Sites UI Updates
- Add industry selector to site creation/editing in `VendorSites.tsx`
- Each site card shows its assigned industry
- Widget install/config is per-site with industry-specific fields

### Phase 5: Widget Config Per-Site
- `WidgetIndustryConfig` loads config based on the site's industry, not a global vendor industry
- Each widget embed code is site-specific
