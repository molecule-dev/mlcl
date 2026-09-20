-- App: field-service. Domain baseline for the quote → job → invoice flow.
--
-- Framework tables (users, usersSecrets, devices, payments, notifications)
-- follow the fleet-standard scaffold shape. Domain tables:
--   customers / technicians      — the address book and the crew
--   quotes + quote_items         — money in integer cents (rate_cents, total_cents)
--   jobs + job_checklist + job_notes — scheduled work per technician
--   invoices + invoice_items     — billed from completed jobs
CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    qty numeric(10,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT 'each'::text NOT NULL,
    rate_cents integer DEFAULT 0 NOT NULL,
    position integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    job_id uuid,
    customer_id uuid NOT NULL,
    number text,
    status text DEFAULT 'draft'::text NOT NULL,
    total_cents integer DEFAULT 0 NOT NULL,
    issued_at timestamp with time zone,
    sent_at timestamp with time zone,
    paid_at timestamp with time zone,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: job_checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_checklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    label text NOT NULL,
    done boolean DEFAULT false NOT NULL,
    done_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: job_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    quote_id uuid,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    scheduled_start timestamp with time zone,
    scheduled_end timestamp with time zone,
    status text DEFAULT 'scheduled'::text NOT NULL,
    technician_id uuid,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text DEFAULT 'info'::text NOT NULL,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    link text,
    payload jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    qty numeric(10,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT 'each'::text NOT NULL,
    rate_cents integer DEFAULT 0 NOT NULL,
    position integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    valid_until timestamp with time zone,
    total_cents integer DEFAULT 0 NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    sent_at timestamp with time zone,
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: technicians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.technicians (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    trade text DEFAULT 'general'::text NOT NULL,
    phone text,
    email text,
    skills text[] DEFAULT '{}'::text[] NOT NULL,
    active boolean DEFAULT true NOT NULL,
    photo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: usersSecrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."usersSecrets" (
    id uuid NOT NULL,
    "passwordHash" text,
    "passwordResetToken" text,
    "passwordResetTokenAt" timestamp with time zone,
    "pendingTwoFactorSecret" text,
    "twoFactorSecret" text
);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: job_checklist job_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_checklist
    ADD CONSTRAINT job_checklist_pkey PRIMARY KEY (id);


--
-- Name: job_notes job_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_notes
    ADD CONSTRAINT job_notes_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: technicians technicians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_pkey PRIMARY KEY (id);


--
-- Name: usersSecrets usersSecrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: devices_createdAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");


--
-- Name: devices_updatedAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");


--
-- Name: devices_userId_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");


--
-- Name: payments_createdAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_createdAt_index" ON public.payments USING btree ("createdAt");


--
-- Name: payments_platformKey_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_platformKey_index" ON public.payments USING btree ("platformKey");


--
-- Name: payments_productId_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_productId_index" ON public.payments USING btree ("productId");


--
-- Name: payments_transactionId_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_transactionId_index" ON public.payments USING btree ("transactionId");


--
-- Name: payments_updatedAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_updatedAt_index" ON public.payments USING btree ("updatedAt");


--
-- Name: payments_userId_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_userId_index" ON public.payments USING btree ("userId");


--
-- Name: users_createdAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");


--
-- Name: users_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_index ON public.users USING btree (email);


--
-- Name: users_updatedAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");


--
-- Name: users_username_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_username_index ON public.users USING btree (username);


--
