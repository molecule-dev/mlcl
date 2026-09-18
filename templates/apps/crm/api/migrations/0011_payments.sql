-- Adds the payments table required by @molecule/api-resource-payment.
-- This is the same schema scaffolded into other flagship apps from
-- molecule/packages/api/resources/payment/setup/payments.sql.

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid NOT NULL,
    "transactionId" text,
    "productId" text,
    "platformKey" text,
    data jsonb,
    receipt text
);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS "payments_createdAt_index"  ON public.payments USING btree ("createdAt");
CREATE INDEX IF NOT EXISTS "payments_updatedAt_index"  ON public.payments USING btree ("updatedAt");
CREATE INDEX IF NOT EXISTS "payments_userId_index"      ON public.payments USING btree ("userId");
CREATE INDEX IF NOT EXISTS "payments_transactionId_index" ON public.payments USING btree ("transactionId");
CREATE INDEX IF NOT EXISTS "payments_productId_index"  ON public.payments USING btree ("productId");
CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON public.payments USING btree ("platformKey");
