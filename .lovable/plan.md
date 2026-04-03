## AI Coordination Signal System

### What It Does
Creates a shared intelligence layer where the 3 AI assistants (Amani, Zawadi, Emmanuel) write and read signals about user interactions, enabling cross-role awareness.

### Step 1: Create `ai_signals` Table
A new table where each assistant logs actionable events:
- `signal_type` — e.g., `buyer_reported_damage`, `vendor_escalation`, `fraud_pattern_detected`
- `source_assistant` — which AI wrote the signal (amani/zawadi/emmanuel)
- `target_role` — who should see it (vendor/buyer/admin/all)
- `transaction_id` — related order
- `user_id` — related user
- `severity` — info/warning/critical
- `summary` — human-readable description
- `is_resolved` — whether the signal has been acted on
- RLS: Admins read all; service role inserts; users read signals targeting them

### Step 2: Update Edge Functions
- **amani-chat**: At conversation start, query `ai_signals` for active signals about the vendor's transactions. Inject relevant signals into the system prompt context. After conversation, write signals if vendor reports issues.
- **zawadi-chat**: Same pattern for buyer signals. Write signals when buyer reports damage, non-delivery, etc.
- **emmanuel-chat**: Reads ALL signals across both roles. Gets the full picture before admin even asks. Can mark signals as resolved.

### Step 3: Signal Flow Examples
1. Buyer tells Zawadi "goods arrived damaged" → Zawadi writes `buyer_reported_damage` signal
2. Emmanuel sees the signal automatically in next admin conversation about that order
3. Amani sees it when vendor opens chat, warns: "Heads up — the buyer on order TL-XXX has reported an issue"

### Files Modified
- `supabase/migrations/` — new `ai_signals` table
- `supabase/functions/amani-chat/index.ts` — read/write signals
- `supabase/functions/zawadi-chat/index.ts` — read/write signals  
- `supabase/functions/emmanuel-chat/index.ts` — read all signals, mark resolved
