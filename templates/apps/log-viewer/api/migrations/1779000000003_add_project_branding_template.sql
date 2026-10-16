-- The @molecule/api-resource-project update handler persists "templateSlug"
-- (the template a project was scaffolded from) and "brandingSpec" (its branding)
-- — but this template's own projects DDL declared neither, and only
-- api/migrations/*.sql is applied, so the package's setup DDL was shadowed and
-- PATCH /projects failed the whole statement with 42703.
--
-- Idempotent ALTERs, the same shape and reason as
-- 1779000000000_add_lastTwoFactorTimeStep: columns the shared resource writes
-- that the per-app schema was missing.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "templateSlug" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "brandingSpec" jsonb;
