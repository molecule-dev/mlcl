-- payments table — required by @molecule/api-resource-payment for any
-- handler that records a Stripe transaction (signup grant, plan upgrade,
-- one-shot purchase, etc.). The squashed 0010 baseline did not include
-- it because the original prototype did not exercise the payment
-- handlers; family-tree needs it now that pricing/checkout is live.
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

DO $$
BEGIN
    BEGIN
        ALTER TABLE ONLY public.payments
            ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
    EXCEPTION WHEN duplicate_table THEN
        NULL;
    WHEN invalid_table_definition THEN
        NULL;
    END;
END$$;

CREATE INDEX IF NOT EXISTS "payments_userId_index" ON public.payments USING btree ("userId");
