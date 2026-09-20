-- App: shift-scheduling. Baseline domain migration, hand-derived in the
-- same shape as the other flagship templates (verified-green schema, single
-- replayable file). `mlcl create shift-scheduling` scaffolds this as
-- migration 0010 and the runtime migration runner applies it as a single
-- transaction at first boot.
CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "actorId" character varying(255) NOT NULL,
    action character varying(255) NOT NULL,
    "resourceType" character varying(255) NOT NULL,
    "resourceId" character varying(255) NOT NULL,
    metadata jsonb,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_seen_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_seen_status (
    "userId" character varying(255) NOT NULL,
    "lastSeenActivityId" uuid NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    actor_id uuid,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    before jsonb,
    after jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: availabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    weekday integer NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: blackout_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blackout_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    date date NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
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
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    staff_id uuid,
    role text DEFAULT 'general'::text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    published boolean DEFAULT false NOT NULL,
    notes text,
    assigned_via text DEFAULT 'assigned'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    role text DEFAULT 'general'::text NOT NULL,
    max_weekly_hours integer DEFAULT 40,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: swap_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.swap_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text DEFAULT 'swap'::text NOT NULL,
    from_shift uuid NOT NULL,
    requester_staff_id uuid NOT NULL,
    target_staff_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    note text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
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
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_seen_status activity_seen_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_seen_status
    ADD CONSTRAINT activity_seen_status_pkey PRIMARY KEY ("userId");


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: availabilities availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availabilities
    ADD CONSTRAINT availabilities_pkey PRIMARY KEY (id);


--
-- Name: blackout_dates blackout_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blackout_dates
    ADD CONSTRAINT blackout_dates_pkey PRIMARY KEY (id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: swap_requests swap_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.swap_requests
    ADD CONSTRAINT swap_requests_pkey PRIMARY KEY (id);


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
-- Name: audit_events_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_user_idx ON public.audit_events USING btree (user_id, occurred_at DESC);


--
-- Name: audit_events_user_record_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_user_record_idx ON public.audit_events USING btree (user_id, table_name, record_id);


--
-- Name: availabilities_staff_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availabilities_staff_idx ON public.availabilities USING btree (user_id, staff_id, weekday);


--
-- Name: availabilities_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availabilities_user_idx ON public.availabilities USING btree (user_id);


--
-- Name: blackout_dates_staff_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blackout_dates_staff_idx ON public.blackout_dates USING btree (user_id, staff_id, date);


--
-- Name: claims_shift_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX claims_shift_idx ON public.claims USING btree (user_id, shift_id, status);


--
-- Name: claims_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX claims_user_idx ON public.claims USING btree (user_id);


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
-- Name: idx_activities_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_actor ON public.activities USING btree ("actorId");


--
-- Name: idx_activities_createdAt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_activities_createdAt" ON public.activities USING btree ("createdAt" DESC);


--
-- Name: idx_activities_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_resource ON public.activities USING btree ("resourceType", "resourceId");


--
-- Name: shifts_staff_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shifts_staff_start_idx ON public.shifts USING btree (user_id, staff_id, starts_at);


--
-- Name: shifts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shifts_user_idx ON public.shifts USING btree (user_id);


--
-- Name: shifts_user_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shifts_user_published_idx ON public.shifts USING btree (user_id, published);


--
-- Name: shifts_user_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shifts_user_start_idx ON public.shifts USING btree (user_id, starts_at);


--
-- Name: staff_user_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_user_email_idx ON public.staff USING btree (user_id, email);


--
-- Name: staff_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_user_idx ON public.staff USING btree (user_id);


--
-- Name: staff_user_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_user_role_idx ON public.staff USING btree (user_id, role);


--
-- Name: staff_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_user_status_idx ON public.staff USING btree (user_id, status);


--
-- Name: swap_requests_shift_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX swap_requests_shift_idx ON public.swap_requests USING btree (user_id, from_shift, status);


--
-- Name: swap_requests_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX swap_requests_user_idx ON public.swap_requests USING btree (user_id);


--
-- Name: swap_requests_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX swap_requests_user_status_idx ON public.swap_requests USING btree (user_id, status);


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
