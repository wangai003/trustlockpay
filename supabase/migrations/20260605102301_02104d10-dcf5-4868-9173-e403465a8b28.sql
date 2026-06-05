DROP TRIGGER IF EXISTS trg_auto_route_inbound_on_confirmed ON public.checkout_sessions;
DROP FUNCTION IF EXISTS public.auto_route_inbound_on_confirmed();