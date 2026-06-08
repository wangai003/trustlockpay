
-- Reassign any technical-slug data to operations
UPDATE public.admin_department_tasks SET department_slug='operations' WHERE department_slug='technical';
UPDATE public.admin_dept_chat_messages SET department_slug='operations' WHERE department_slug='technical';
UPDATE public.admin_cross_department_alerts SET target_department='operations' WHERE target_department='technical';
UPDATE public.admin_cross_department_alerts SET source_department='operations' WHERE source_department='technical';
UPDATE public.admin_department_transfers SET from_department_slug='operations' WHERE from_department_slug='technical';
UPDATE public.admin_department_transfers SET to_department_slug='operations' WHERE to_department_slug='technical';
UPDATE public.admin_department_rr_pointer SET department_slug='operations' WHERE department_slug='technical';

-- Move any admins assigned to technical dept to operations
UPDATE public.admin_accounts
SET department_id = (SELECT id FROM public.admin_departments WHERE slug='operations')
WHERE department_id = (SELECT id FROM public.admin_departments WHERE slug='technical');

-- Expand IT Department (operations) access modules to absorb technical scope
UPDATE public.admin_departments
SET access_modules = ARRAY(
  SELECT DISTINCT unnest(
    access_modules || ARRAY['system-health','autonomous-fixer','blockchain','gas']::text[]
  )
),
description = 'Consolidated IT — transactions, milestones, vendor/buyer accounts, platform config, blockchain proofs, gas treasury, system health, and autonomous fixer triage.'
WHERE slug = 'operations';

-- Remove the technical department
DELETE FROM public.admin_departments WHERE slug = 'technical';
