
REVOKE EXECUTE ON FUNCTION public.testnet_clock_effective_now(TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.testnet_clock_effective_now(TIMESTAMPTZ, TEXT) TO authenticated, service_role;
