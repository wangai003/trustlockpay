
DO $$
BEGIN
  -- Remove admin tables from realtime if they are currently published
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_dept_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_dept_chat_messages;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_cross_department_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_cross_department_alerts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_department_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_department_tasks;
  END IF;
END $$;
