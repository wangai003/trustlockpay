
-- Fix security definer views — set to security invoker
ALTER VIEW public.arbitrator_sessions_safe SET (security_invoker = true);
ALTER VIEW public.audit_sessions_safe SET (security_invoker = true);
ALTER VIEW public.profiles_counterparty_safe SET (security_invoker = true);
