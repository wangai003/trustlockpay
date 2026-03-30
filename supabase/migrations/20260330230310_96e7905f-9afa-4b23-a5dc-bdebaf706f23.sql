-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "Team members read team evidence" ON storage.objects;

-- Create a properly scoped read policy
-- Path format: {workspace_id}/{task_id}/{filename}
-- Users can only read evidence from workspaces they belong to (or admins can read all)
CREATE POLICY "Team members read own workspace evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'team-evidence'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.workspace_id::text = (storage.foldername(name))[1]
    )
  )
);