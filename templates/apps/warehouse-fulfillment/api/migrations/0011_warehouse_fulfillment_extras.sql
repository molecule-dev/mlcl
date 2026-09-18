-- Adds the columns the UI actually reads (customer info, priority,
-- per-shipment carrier metadata, per-product user scoping) on top of the
-- squashed 0010 baseline. Idempotent — safe to re-apply.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "customerName" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "customerEmail" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "externalOrderId" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS priority text DEFAULT 'standard' NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "shippingMethod" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "weightLb" numeric(8,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "promisedAt" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "idx_orders_priority" ON public.orders (priority);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "userId" uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bin text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "onHand" integer DEFAULT 0 NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "reorderPoint" integer DEFAULT 10 NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_products_userId" ON public.products ("userId");

ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS service text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS dock text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS manifest_number text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS cutoff_at timestamp with time zone;

ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS po_number text;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS expected_units integer DEFAULT 0 NOT NULL;

ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS resolution text DEFAULT 'inspect' NOT NULL;

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS aisle text;

ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS bins integer DEFAULT 0 NOT NULL;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS utilization_pct integer DEFAULT 0 NOT NULL;

ALTER TABLE public.pick_lists ADD COLUMN IF NOT EXISTS pick_number text;
ALTER TABLE public.pick_lines ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.pick_lines ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.pick_lines ADD COLUMN IF NOT EXISTS bin text;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
