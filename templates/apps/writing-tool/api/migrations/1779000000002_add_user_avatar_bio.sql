-- The @molecule/api-resource-user OAuth handler persists a provider-supplied
-- "avatar" and "bio" on signup and backfills both on later logins, and its
-- update handler accepts both from the profile endpoint — but this template's
-- own users DDL declared neither, and only api/migrations/*.sql is applied, so
-- the package's setup/users.sql (CREATE TABLE IF NOT EXISTS) was shadowed and
-- the write failed the whole statement with 42703.
--
-- Idempotent ALTERs, the same shape and reason as
-- 1779000000000_add_lastTwoFactorTimeStep: columns the shared resource writes
-- that the per-app schema was missing.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
