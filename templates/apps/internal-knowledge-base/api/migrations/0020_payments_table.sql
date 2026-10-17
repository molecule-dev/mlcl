-- Adds the `payments` table required by @molecule/api-resource-payment +
-- @molecule/api-payments-stripe. The Stripe bond reads/writes this table
-- when handling subscription state — without it, every checkout call logs
-- a "relation payments does not exist" error and updateSubscription /
-- cancelSubscription cannot persist the result.
--
-- Definition mirrors the canonical schema in
-- @molecule/api-resource-payment/src/__setup__/payments.sql.
CREATE TABLE IF NOT EXISTS "payments" (
    "id" uuid UNIQUE PRIMARY KEY NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
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
