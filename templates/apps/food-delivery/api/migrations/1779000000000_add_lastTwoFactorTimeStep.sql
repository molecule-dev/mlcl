-- P2F-03: TOTP single-use replay protection needs a per-user "last verified step".
-- Idempotent ALTER so it applies to fresh + already-provisioned usersSecrets tables.
-- (The @molecule/api-resource-user logIn/verifyTwoFactor handlers WRITE this column.)
ALTER TABLE "usersSecrets" ADD COLUMN IF NOT EXISTS "lastTwoFactorTimeStep" integer;
