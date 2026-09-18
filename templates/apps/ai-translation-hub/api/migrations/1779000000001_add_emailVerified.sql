-- The @molecule/api-resource-user update handler SETS "emailVerified" to false
-- whenever a user's email changes (so a self-declared address can't stay
-- trusted), but no scaffolded users table ever declared the column. The write
-- therefore failed the entire UPDATE: changing your email returned
-- 400 "Unable to update User." in every flagship, with nothing saved.
--
-- Idempotent ALTER, same shape and reason as
-- 1779000000000_add_lastTwoFactorTimeStep — a column the shared resource writes
-- that the per-app schema was missing.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false;
