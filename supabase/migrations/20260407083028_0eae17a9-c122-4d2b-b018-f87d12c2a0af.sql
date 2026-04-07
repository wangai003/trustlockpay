
-- Create admin departments table
CREATE TABLE public.admin_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  access_modules TEXT[] NOT NULL DEFAULT '{}',
  can_message_clients BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (edge functions use service role, so no public access)
ALTER TABLE public.admin_departments ENABLE ROW LEVEL SECURITY;

-- Seed departments
INSERT INTO public.admin_departments (name, slug, description, access_modules, can_message_clients, sort_order) VALUES
(
  'Executive Office',
  'executive',
  'Chief Admin oversight — full platform access, staff management, overrides, analytics.',
  ARRAY['overview','transactions','disputes','finance','compliance','messages','documents','analytics','settings','staff','workflow','blockchain','emmanuel','training','audit','vendors','buyers','platforms','reports','tax','gas','accountability','industry','sandbox','payout'],
  true,
  0
),
(
  'Correspondence & Client Relations',
  'correspondence',
  'Anonymous client messaging, notification triage, onboarding support, help center escalations.',
  ARRAY['overview','messages','vendors','buyers','training','emmanuel'],
  true,
  1
),
(
  'Disputes & Arbitration',
  'disputes',
  'Dispute case management, arbitration fees, case file packaging, arbitrator portal, ruling enforcement.',
  ARRAY['overview','disputes','documents','training','emmanuel'],
  false,
  2
),
(
  'Finance & Payouts',
  'finance',
  'OS Pay oversight, payout processing, fee auditing, gas treasury, tax remittance, revenue analytics.',
  ARRAY['overview','transactions','finance','payout','tax','gas','analytics','training','emmanuel'],
  false,
  3
),
(
  'Compliance & Risk',
  'compliance',
  'KYC/KYB review, sanctions screening, document scanning, compliance flags, anti-structuring.',
  ARRAY['overview','compliance','documents','training','emmanuel'],
  false,
  4
),
(
  'Operations & Workflow',
  'operations',
  'Transaction monitoring, milestone verification, vendor/buyer accounts, platform config, blockchain proofs.',
  ARRAY['overview','transactions','workflow','vendors','buyers','platforms','blockchain','industry','documents','training','emmanuel'],
  false,
  5
);

-- Add department_id to admin_accounts
ALTER TABLE public.admin_accounts
  ADD COLUMN department_id UUID REFERENCES public.admin_departments(id) ON DELETE SET NULL;

-- Default existing chief admins to Executive
UPDATE public.admin_accounts
SET department_id = (SELECT id FROM public.admin_departments WHERE slug = 'executive')
WHERE id IN (SELECT admin_id FROM public.chief_admin_config WHERE is_active = true);
