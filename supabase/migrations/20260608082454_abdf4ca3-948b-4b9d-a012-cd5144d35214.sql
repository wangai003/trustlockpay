
-- Add a marker so the routing bridge / sweeper know an inbound route already ran
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS inbound_routed_at timestamptz;

-- Backfill: any tx with a fee set and a confirmed checkout session has been routed
UPDATE public.transactions t
SET inbound_routed_at = COALESCE(t.updated_at, now())
WHERE inbound_routed_at IS NULL
  AND t.fee IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.checkout_sessions cs
    WHERE cs.transaction_id = t.id AND cs.status = 'confirmed'
  );

-- Restore the stuck order that the sweeper kept resetting to "locked"
UPDATE public.transactions
SET status = 'shipped'
WHERE tx_id = 'TL-1779966319782'
  AND tracking IS NOT NULL
  AND shipped_date IS NOT NULL
  AND status = 'locked';
