-- Broken-access-control fix: the shared `subscription_plans` catalog is writable
-- only by admins (see src/middleware/require-admin.ts). The users table had no
-- authorization column, so add one. Idempotent ALTER so it applies to fresh +
-- already-provisioned users tables. Matches the online-store `users.role` column.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'customer';
