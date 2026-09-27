-- [2026-09-27 security remediation] Honest at-rest storage for recovery kits
-- and password history.
--
-- vault_recovery_keys: the "recovery kit" was never encrypted — the client
-- wrote base64 noise into `encrypted_recovery_data` beside a decorative
-- `public_key` (`pk-…`) that no code ever read. The kit is an export/copy
-- feature, so the column now says what it holds. The fake key column is
-- dropped (nothing else reads it).
ALTER TABLE public.vault_recovery_keys RENAME COLUMN encrypted_recovery_data TO recovery_kit;
ALTER TABLE public.vault_recovery_keys DROP COLUMN public_key;

-- password_history: the dormant history endpoint stored the caller-supplied
-- "ciphertext" verbatim — attacker-controlled bytes under a column that lied
-- about being encrypted. History rows now hold a server-computed sha256 hex
-- digest and a last-4 preview instead. The old payload cannot be converted
-- (it was never a verifiable artifact and no verify consumer exists), so the
-- column is dropped; new rows appear as users update passwords.
ALTER TABLE public.password_history DROP COLUMN IF EXISTS encrypted_password;
ALTER TABLE public.password_history ADD COLUMN password_hash text;
ALTER TABLE public.password_history ADD COLUMN password_preview text;
