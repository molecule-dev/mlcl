-- The 0010 squashed migration was generated before this app pulled in
-- @molecule/api-payments-stripe + @molecule/api-resource-payment, so the
-- `payments` table that the Stripe bond reads/writes via recordService
-- was missing. Without it, every billing endpoint (`/billing/checkout`,
-- `/billing/cancel`, `/billing/status`) hit a 500 (`relation "payments"
-- does not exist`). Add it here so a fresh scaffold + first boot wires
-- the full billing stack end-to-end.

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

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_pkey'
    ) THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "payments_createdAt_index" ON public.payments USING btree ("createdAt");
CREATE INDEX IF NOT EXISTS "payments_updatedAt_index" ON public.payments USING btree ("updatedAt");
CREATE INDEX IF NOT EXISTS "payments_userId_index" ON public.payments USING btree ("userId");
CREATE INDEX IF NOT EXISTS "payments_transactionId_index" ON public.payments USING btree ("transactionId");
CREATE INDEX IF NOT EXISTS "payments_productId_index" ON public.payments USING btree ("productId");
CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON public.payments USING btree ("platformKey");
