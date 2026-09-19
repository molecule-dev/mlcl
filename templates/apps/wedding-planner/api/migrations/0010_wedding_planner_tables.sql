-- App: wedding-planner. Baseline domain migration.
--
-- Single-wedding app (like the fleet's other single-tenant apps): each user
-- owns at most one `weddings` row; every domain table carries both user_id
-- and wedding_id so ownership checks are uniform and future multi-wedding
-- support is a query change, not a schema change.
--
-- The public RSVP collection flow is keyed on weddings.rsvp_code (the code
-- the couple shares); guests confirm by entering their name on
-- /rsvp/:code — no emails are sent.

CREATE TABLE public.users (
    id uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    username character varying(255),
    name text,
    email character varying(1023),
    "twoFactorEnabled" boolean DEFAULT false,
    "oauthServer" text,
    "oauthId" text,
    "oauthData" jsonb,
    "planKey" text,
    "planExpiresAt" timestamp with time zone,
    "planAutoRenews" boolean DEFAULT false
);

CREATE TABLE public."usersSecrets" (
    id uuid NOT NULL,
    "passwordHash" text,
    "passwordResetToken" text,
    "passwordResetTokenAt" timestamp with time zone,
    "pendingTwoFactorSecret" text,
    "twoFactorSecret" text
);

CREATE TABLE public.devices (
    id uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid NOT NULL,
    name text,
    "pushPlatform" text,
    "pushSubscription" jsonb,
    "hasPushSubscription" boolean
);

CREATE TABLE public.payments (
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

CREATE TABLE public.weddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    partner_a_name text NOT NULL,
    partner_b_name text NOT NULL,
    wedding_date timestamptz,
    venue text,
    rsvp_code character varying(24) NOT NULL,
    plus_ones_allowed boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.guests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    name text NOT NULL,
    side text DEFAULT 'both'::text NOT NULL,
    group_name text,
    email text,
    phone text,
    rsvp_status text DEFAULT 'pending'::text NOT NULL,
    meal_choice text,
    plus_ones integer DEFAULT 0 NOT NULL,
    notes text,
    responded_at timestamptz,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.rsvp_meals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    position integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.budget_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    label text NOT NULL,
    estimated_cents integer DEFAULT 0 NOT NULL,
    actual_cents integer,
    vendor text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    name text NOT NULL,
    contact text,
    status text DEFAULT 'researching'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'planning'::text NOT NULL,
    due_date date,
    done boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    name text NOT NULL,
    capacity integer DEFAULT 8 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.table_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    table_id uuid NOT NULL,
    guest_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Primary keys
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.weddings
    ADD CONSTRAINT weddings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rsvp_meals
    ADD CONSTRAINT rsvp_meals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.table_assignments
    ADD CONSTRAINT table_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.weddings
    ADD CONSTRAINT weddings_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.weddings
    ADD CONSTRAINT weddings_rsvp_code_key UNIQUE (rsvp_code);

ALTER TABLE ONLY public.table_assignments
    ADD CONSTRAINT table_assignments_guest_id_key UNIQUE (guest_id);

--
-- Indexes
--

CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");

CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");

CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");

CREATE INDEX "payments_createdAt_index" ON public.payments USING btree ("createdAt");

CREATE INDEX "payments_platformKey_index" ON public.payments USING btree ("platformKey");

CREATE INDEX "payments_productId_index" ON public.payments USING btree ("productId");

CREATE INDEX "payments_transactionId_index" ON public.payments USING btree ("transactionId");

CREATE INDEX "payments_updatedAt_index" ON public.payments USING btree ("updatedAt");

CREATE INDEX "payments_userId_index" ON public.payments USING btree ("userId");

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");

CREATE INDEX "users_email_index" ON public.users USING btree (email);

CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");

CREATE INDEX "users_username_index" ON public.users USING btree (username);

CREATE INDEX guests_user_id_idx ON public.guests USING btree (user_id);

CREATE INDEX guests_wedding_id_idx ON public.guests USING btree (wedding_id);

CREATE INDEX guests_rsvp_status_idx ON public.guests USING btree (rsvp_status);

CREATE INDEX rsvp_meals_wedding_id_idx ON public.rsvp_meals USING btree (wedding_id);

CREATE INDEX budget_items_user_id_idx ON public.budget_items USING btree (user_id);

CREATE INDEX budget_items_wedding_id_idx ON public.budget_items USING btree (wedding_id);

CREATE INDEX vendors_user_id_idx ON public.vendors USING btree (user_id);

CREATE INDEX vendors_wedding_id_idx ON public.vendors USING btree (wedding_id);

CREATE INDEX tasks_user_id_idx ON public.tasks USING btree (user_id);

CREATE INDEX tasks_wedding_id_idx ON public.tasks USING btree (wedding_id);

CREATE INDEX tasks_due_date_idx ON public.tasks USING btree (due_date);

CREATE INDEX tables_wedding_id_idx ON public.tables USING btree (wedding_id);

CREATE INDEX table_assignments_table_id_idx ON public.table_assignments USING btree (table_id);

CREATE INDEX table_assignments_guest_id_idx ON public.table_assignments USING btree (guest_id);

--
-- Foreign keys
--

ALTER TABLE ONLY public.table_assignments
    ADD CONSTRAINT table_assignments_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.table_assignments
    ADD CONSTRAINT table_assignments_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;
