## Emmanuel AI Capability Expansion

### Approach
Create a new `emmanuel-analytics` edge function that Emmanuel can invoke via tool-calling, plus expand the system prompt with policy knowledge and communication drafting abilities.

### Step 1: Create `emmanuel-analytics` edge function
A data-query backend that Emmanuel calls as a tool. Supports these actions:
- `risk_score` — Compute risk profile for a user (dispute rate, response time, flags)
- `vendor_health` — Generate vendor trust score from transaction/dispute/KYC data
- `fraud_patterns` — Detect clustering (multiple disputes against one vendor, one buyer across vendors)
- `escalation_predict` — Score open disputes by likelihood of escalation
- `audit_summary` — Pull aggregated compliance/dispute/sanctions data for a date range
- `kyc_nudge` — Find vendors stuck at low KYC tiers with growing volume

### Step 2: Update `emmanuel-chat` edge function
- Add tool definitions so Emmanuel can call `emmanuel-analytics`
- Expand system prompt with:
  - Full dispute resolution policy Q&A knowledge
  - Admin communication drafting templates (rulings, notifications, escalations)
  - KYC nudge recommendation language
  - Escalation prediction interpretation guidance

### Step 3: Update Admin Emmanuel UI
- Add capability badges showing Emmanuel's new skills
- Update the hero card description

### Files modified:
- `supabase/functions/emmanuel-analytics/index.ts` (new)
- `supabase/functions/emmanuel-chat/index.ts` (updated)
- `src/pages/admin/AdminEmmanuel.tsx` (minor UI update)
