-- 4. Remove unscoped protection-documents INSERT policy
DROP POLICY IF EXISTS "Auth upload protection docs" ON storage.objects;

-- 5. Remove unscoped team-evidence INSERT policy  
DROP POLICY IF EXISTS "Auth upload team evidence" ON storage.objects;