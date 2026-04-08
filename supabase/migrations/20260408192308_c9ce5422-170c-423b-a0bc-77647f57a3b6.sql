
DROP POLICY IF EXISTS "Anyone can read arbitrator rulings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload arbitrator rulings" ON storage.objects;
DROP POLICY IF EXISTS "Public can read arbitrator rulings" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload arbitrator rulings" ON storage.objects;
DROP POLICY IF EXISTS "Auth read arbitrator rulings" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload arbitrator rulings" ON storage.objects;

CREATE POLICY "Auth read arbitrator rulings"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'arbitrator-rulings');

CREATE POLICY "Auth upload arbitrator rulings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'arbitrator-rulings');
