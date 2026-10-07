-- payments: the table @molecule/api-resource-payment reads and writes (payment
-- records, the customer id the billing webhooks look users up by). Same DDL as
-- that package's setup/payments.sql, which a scaffold also replays from
-- __setup__/; every statement is IF NOT EXISTS, so running both is a no-op.
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
-- A platform transaction must bind to exactly ONE account (first-claim-wins).
-- This UNIQUE index is the race-safe backstop for receipt/subscription replay
-- (R2-1): a second account inserting the same (platformKey, transactionId)
-- fails, so it can never be granted the plan. Also serves the transactionId
-- lookup the plain index used to. NULL transactionIds are allowed/non-unique.
CREATE UNIQUE INDEX IF NOT EXISTS "payments_platformKey_transactionId_unique" ON "payments" ("platformKey", "transactionId");
CREATE INDEX IF NOT EXISTS "payments_productId_index" ON "payments" ("productId");
CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON "payments" ("platformKey");
