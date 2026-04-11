CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _entity_type text;
  _company_name text;
  _confirmed boolean;
  _website_url text;
  _social_links jsonb;
BEGIN
  _entity_type := COALESCE(NEW.raw_user_meta_data->>'entity_type', 'individual');
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _confirmed := (NEW.raw_user_meta_data->>'entity_type') IS NOT NULL;
  _website_url := NEW.raw_user_meta_data->>'website_url';
  _social_links := CASE
    WHEN NEW.raw_user_meta_data->'social_links' IS NOT NULL
      AND jsonb_typeof(NEW.raw_user_meta_data->'social_links') = 'object'
    THEN NEW.raw_user_meta_data->'social_links'
    ELSE NULL
  END;

  INSERT INTO public.profiles (id, email, full_name, entity_type, company_name, entity_type_confirmed, website_url, social_links)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _entity_type,
    _company_name,
    _confirmed,
    _website_url,
    _social_links
  );

  -- Auto-assign role from metadata
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  END IF;

  RETURN NEW;
END;
$function$;