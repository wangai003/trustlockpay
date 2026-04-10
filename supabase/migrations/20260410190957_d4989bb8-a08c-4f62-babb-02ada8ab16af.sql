
-- Remove FK from transactions first
ALTER TABLE public.transactions DROP COLUMN IF EXISTS financing_order_id;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_log_financing_order_event ON public.financing_orders;
DROP TRIGGER IF EXISTS trg_update_financing_order_updated_at ON public.financing_orders;

-- Drop tables
DROP TABLE IF EXISTS public.financing_order_events CASCADE;
DROP TABLE IF EXISTS public.financing_orders CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.log_financing_order_event();
DROP FUNCTION IF EXISTS public.update_financing_order_updated_at();
