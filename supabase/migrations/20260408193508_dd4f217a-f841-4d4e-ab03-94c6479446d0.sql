
DO $$
BEGIN
  -- Remove sanctions_screening_logs from realtime to prevent PII leakage
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sanctions_screening_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.sanctions_screening_logs;
  END IF;
END $$;
