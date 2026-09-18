-- Adds orders + order_items (PO/SO tracking with line-level expected/received)
-- and notifications (system-level user notifications). Does not drop or
-- alter any tables in 0010 — purely additive.

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reference text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    partner text DEFAULT ''::text NOT NULL,
    warehouse_id uuid,
    expected_at timestamp with time zone,
    received_at timestamp with time zone,
    total_units integer DEFAULT 0 NOT NULL,
    total_value_cents bigint DEFAULT 0 NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders USING btree (user_id);
CREATE INDEX IF NOT EXISTS orders_warehouse_id_idx ON public.orders USING btree (warehouse_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders USING btree (status);
CREATE INDEX IF NOT EXISTS orders_type_idx ON public.orders USING btree (type);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders USING btree (created_at);

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    sku text DEFAULT ''::text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    expected_quantity integer DEFAULT 0 NOT NULL,
    received_quantity integer DEFAULT 0 NOT NULL,
    unit_cost_cents integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items USING btree (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items USING btree (product_id);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text DEFAULT 'system'::text NOT NULL,
    icon text DEFAULT 'notifications'::text NOT NULL,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    href text,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications USING btree (read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications USING btree (created_at);

-- Add user_id column to inventory_alerts so we can scope per-tenant cleanly.
ALTER TABLE public.inventory_alerts ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS inventory_alerts_user_id_idx ON public.inventory_alerts USING btree (user_id);
