-- App: construction-management. Domain baseline for the daily-log →
-- punch-list → RFI flow on commercial construction projects.
--
-- Framework tables (users, usersSecrets, devices, payments) follow the
-- fleet-standard scaffold shape. Domain tables:
--   projects                     -- a jobsite: phase, budget (integer cents), progress
--   daily_logs + log_entries     -- the daily field record: weather, crew, work per area
--   punch_items                  -- checklist defects with plan location + severity
--   rfis + rfi_responses         -- threaded Q&A; a final response marks the RFI answered
--   subcontractors               -- per-project trade directory, contract value in cents
CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    phase text DEFAULT 'preconstruction'::text NOT NULL,
    budget_cents bigint DEFAULT 0 NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    project_id uuid NOT NULL,
    log_date date NOT NULL,
    weather text DEFAULT ''::text NOT NULL,
    crew_count integer DEFAULT 0 NOT NULL,
    hours integer DEFAULT 0 NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: log_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    log_id uuid NOT NULL,
    area text DEFAULT ''::text NOT NULL,
    work_performed text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: punch_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.punch_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    project_id uuid NOT NULL,
    location text DEFAULT ''::text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    description text NOT NULL,
    assignee text,
    status text DEFAULT 'open'::text NOT NULL,
    photo_url text,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: rfis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    project_id uuid NOT NULL,
    number integer NOT NULL,
    title text NOT NULL,
    question text NOT NULL,
    originator text DEFAULT ''::text NOT NULL,
    drawings_ref text DEFAULT ''::text NOT NULL,
    due_date date,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: rfi_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfi_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rfi_id uuid NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    is_final boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: subcontractors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontractors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    project_id uuid NOT NULL,
    trade text NOT NULL,
    company text NOT NULL,
    contact text DEFAULT ''::text NOT NULL,
    contract_value_cents bigint DEFAULT 0 NOT NULL,
    status text DEFAULT 'invited'::text NOT NULL,
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
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: daily_logs daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);


--
-- Name: log_entries log_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_entries
    ADD CONSTRAINT log_entries_pkey PRIMARY KEY (id);


--
-- Name: punch_items punch_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punch_items
    ADD CONSTRAINT punch_items_pkey PRIMARY KEY (id);


--
-- Name: rfis rfis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_pkey PRIMARY KEY (id);


--
-- Name: rfi_responses rfi_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_responses
    ADD CONSTRAINT rfi_responses_pkey PRIMARY KEY (id);


--
-- Name: subcontractors subcontractors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractors
    ADD CONSTRAINT subcontractors_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


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
-- Name: daily_logs_log_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_logs_log_date_idx ON public.daily_logs USING btree (log_date DESC);


--
-- Name: daily_logs_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_logs_owner_id_idx ON public.daily_logs USING btree (owner_id);


--
-- Name: daily_logs_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_logs_project_id_idx ON public.daily_logs USING btree (project_id);


--
-- Name: log_entries_log_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX log_entries_log_id_idx ON public.log_entries USING btree (log_id);


--
-- Name: projects_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_owner_id_idx ON public.projects USING btree (owner_id);


--
-- Name: projects_phase_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_phase_idx ON public.projects USING btree (phase);


--
-- Name: punch_items_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX punch_items_owner_id_idx ON public.punch_items USING btree (owner_id);


--
-- Name: punch_items_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX punch_items_project_id_idx ON public.punch_items USING btree (project_id);


--
-- Name: punch_items_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX punch_items_status_idx ON public.punch_items USING btree (status);


--
-- Name: rfis_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfis_owner_id_idx ON public.rfis USING btree (owner_id);


--
-- Name: rfis_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfis_project_id_idx ON public.rfis USING btree (project_id);


--
-- Name: rfis_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfis_status_idx ON public.rfis USING btree (status);


--
-- Name: rfi_responses_rfi_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfi_responses_rfi_id_idx ON public.rfi_responses USING btree (rfi_id);


--
-- Name: subcontractors_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subcontractors_owner_id_idx ON public.subcontractors USING btree (owner_id);


--
-- Name: subcontractors_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subcontractors_project_id_idx ON public.subcontractors USING btree (project_id);


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
