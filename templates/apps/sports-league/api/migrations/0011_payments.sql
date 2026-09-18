-- Payments table — required by @molecule/api-resource-payment + @molecule/api-payments-stripe.
-- The Stripe bond's `updateSubscription` calls `paymentRecordService.findByUserId(userId)`
-- to look up the user's existing Stripe customer/subscription before opening a new
-- checkout. Without this table, /api/billing/checkout returns a 503/500.

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
