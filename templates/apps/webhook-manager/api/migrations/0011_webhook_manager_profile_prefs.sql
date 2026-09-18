-- 0011_webhook_manager_profile_prefs.sql
-- Adds the columns the profile + audit handlers need on top of the
-- 0010 baseline. Idempotent: safe to re-apply.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb NOT NULL;

-- Channel-prefs JSON for the Notifications page (per-channel toggles
-- + quiet hours). Stored on users so we don't need a separate table.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}'::jsonb NOT NULL;

-- The audit-events table's `user_id` becomes nullable so account-delete
-- can anonymise rows (set user_id NULL, actor='deleted-user') without
-- losing the row.
ALTER TABLE public.audit_events
  ALTER COLUMN user_id DROP NOT NULL;

-- payments table required by @molecule/api-resource-payment (Stripe billing).
CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "updatedAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "userId" uuid NOT NULL,
  "transactionId" text,
  "productId" text,
  "platformKey" text,
  "data" jsonb,
  "receipt" text
);
CREATE INDEX IF NOT EXISTS "payments_createdAt_index" ON "payments" ("createdAt");
CREATE INDEX IF NOT EXISTS "payments_updatedAt_index" ON "payments" ("updatedAt");
CREATE INDEX IF NOT EXISTS "payments_userId_index" ON "payments" ("userId");
CREATE INDEX IF NOT EXISTS "payments_transactionId_index" ON "payments" ("transactionId");
CREATE INDEX IF NOT EXISTS "payments_productId_index" ON "payments" ("productId");
CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON "payments" ("platformKey");
