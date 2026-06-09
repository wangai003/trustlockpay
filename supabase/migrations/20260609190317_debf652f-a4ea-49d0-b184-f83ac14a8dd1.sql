DO $$
DECLARE
  _names text;
BEGIN
  SELECT string_agg(name, ', ') INTO _names FROM vault.decrypted_secrets;
  RAISE NOTICE 'Vault secrets present: %', _names;
END $$;