-- Add confirmation flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS entity_type_confirmed boolean NOT NULL DEFAULT false;

-- Update handle_new_user to persist entity_type and company_name from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _entity_type text;
  _company_name text;
  _confirmed boolean;
BEGIN
  _entity_type := COALESCE(NEW.raw_user_meta_data->>'entity_type', 'individual');
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _confirmed := (NEW.raw_user_meta_data->>'entity_type') IS NOT NULL;

  INSERT INTO public.profiles (id, email, full_name, entity_type, company_name, entity_type_confirmed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _entity_type,
    _company_name,
    _confirmed
  );

  -- Auto-assign role from metadata
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  END IF;

  RETURN NEW;
END;
$$;