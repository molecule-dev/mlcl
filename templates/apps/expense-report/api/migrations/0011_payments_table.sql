-- Payments table for @molecule/api-resource-payment.
-- Required by:
--   - PaymentRecordService (paymentRecords bond, used by Stripe billing flow)
--   - PlanService (plans bond, used by the user webhook handler)
-- Without this table, /api/billing/checkout silently falls back to creating
-- new Stripe checkout sessions every time and the post-checkout user
-- payment-notification webhook fails to look up the customerId.

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
