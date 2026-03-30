-- Replace overly restrictive header-based policy with status-scoped policy
-- Standalone links are intentionally public (shareable checkout URLs)
-- but we limit to active links only to prevent enumeration of inactive/draft data
DROP POLICY IF EXISTS "Anon read single link by id" ON public.standalone_links;

CREATE POLICY "Anon read active links" ON public.standalone_links
FOR SELECT TO anon
USING (status = 'active');