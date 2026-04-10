
-- Fix: platform_config should not allow public INSERT/UPDATE/DELETE
-- SELECT with USING(true) is fine for read-only config

-- No additional policies needed - only SELECT exists which is intentional for public read config
-- The table has no INSERT/UPDATE/DELETE policies so those operations are blocked by RLS
-- This is the desired behavior - only service role can write config
SELECT 1;
