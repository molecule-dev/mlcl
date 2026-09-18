-- Adds the `payments` table required by @molecule/api-resource-payment +
-- @molecule/api-payments-stripe. The original 0010 migration omitted it,
-- which caused every Stripe webhook + checkout success path to log
-- `relation "payments" does not exist` and silently fail to record the
-- charge against the user (planKey wouldn't flip).
--
-- The table is created in a single statement (PRIMARY KEY inline) so the
-- migration is idempotent across re-runs.

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid NOT NULL,
    "transactionId" text,
    "productId" text,
    "platformKey" text,
    data jsonb,
    receipt text
);

CREATE INDEX IF NOT EXISTS "payments_createdAt_index" ON public.payments USING btree ("createdAt");
CREATE INDEX IF NOT EXISTS "payments_updatedAt_index" ON public.payments USING btree ("updatedAt");
CREATE INDEX IF NOT EXISTS "payments_userId_index" ON public.payments USING btree ("userId");
CREATE INDEX IF NOT EXISTS "payments_transactionId_index" ON public.payments USING btree ("transactionId");
CREATE INDEX IF NOT EXISTS "payments_productId_index" ON public.payments USING btree ("productId");
CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON public.payments USING btree ("platformKey");
