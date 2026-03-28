
-- Add deadline/SLA columns to team_task_assignments
ALTER TABLE team_task_assignments
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_hours integer;

-- Add preferred_language to team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

-- Create team_role_presets table
CREATE TABLE IF NOT EXISTS team_role_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  role_name text NOT NULL,
  role_key text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_role_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read role presets" ON team_role_presets
  FOR SELECT TO anon, authenticated USING (true);

-- Create team-evidence storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-evidence', 'team-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for team-evidence bucket
CREATE POLICY "Auth upload team evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-evidence');

CREATE POLICY "Auth read team evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'team-evidence');
