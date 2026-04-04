
-- Reset temp passwords to known values for testing
UPDATE admin_accounts SET temp_password_hash = crypt('TempMk2026!', gen_salt('bf')), failed_attempts = 0, locked_at = NULL WHERE username = 'michael.tl';
UPDATE admin_accounts SET temp_password_hash = crypt('TempDv2026!', gen_salt('bf')), failed_attempts = 0, locked_at = NULL WHERE username = 'david.tl';
UPDATE admin_accounts SET temp_password_hash = crypt('TempEm2026!', gen_salt('bf')), failed_attempts = 0, locked_at = NULL WHERE username = 'emmanuel.tl';
