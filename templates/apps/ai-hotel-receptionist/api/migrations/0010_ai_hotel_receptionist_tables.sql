-- App: ai-hotel-receptionist. Bespoke domain migration for the
-- multilingual AI voice receptionist + PMS template (written new for the
-- 134→150 fleet build; not squashed — this schema shipped in one step).
--
-- Domain: a single-property hotel PMS. room_types are sellable categories,
-- rooms are physical units on floors, rate_plans adjust the base rate by
-- weekday/weekend, reservations are guest stays, guests are the property's
-- guest profiles, voice_agents are the multilingual phone receptionists,
-- and calls/call_messages/call_actions record each simulated (or real)
-- inbound conversation including every tool the agent executed.
--
-- Note: reservations/guests/rooms etc. are PROPERTY-scoped (shared by all
-- staff users of the single property), not user-scoped — handlers enforce
-- authentication but deliberately do not filter by user_id. `created_by` on
-- reservations and `user_id` on calls attribute the actor.

CREATE TABLE public.room_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    occupancy integer DEFAULT 2 NOT NULL,
    base_rate_cents integer NOT NULL,
    amenities jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number text NOT NULL,
    floor integer NOT NULL,
    room_type_id uuid NOT NULL,
    status text DEFAULT 'vacant_clean'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.rate_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    room_type_id uuid NOT NULL,
    weekday_adjustment_percent integer DEFAULT 0 NOT NULL,
    weekend_adjustment_percent integer DEFAULT 0 NOT NULL,
    seasonal_override_cents integer,
    seasonal_start date,
    seasonal_end date,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.guests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    preferred_language text DEFAULT 'en'::text NOT NULL,
    notes text,
    stay_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guest_id uuid,
    guest_name text NOT NULL,
    guest_contact text,
    room_type_id uuid NOT NULL,
    room_id uuid,
    check_in date NOT NULL,
    check_out date NOT NULL,
    guests integer DEFAULT 1 NOT NULL,
    nights integer DEFAULT 1 NOT NULL,
    total_cents integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'held'::text NOT NULL,
    source text DEFAULT 'front_desk'::text NOT NULL,
    confirmation_code text NOT NULL,
    notes text,
    created_by uuid,
    cancelled_at timestamp with time zone,
    checked_in_at timestamp with time zone,
    checked_out_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.voice_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone_number text NOT NULL,
    languages jsonb DEFAULT '["en","es","fr","de","zh","ja"]'::jsonb NOT NULL,
    voice_by_language jsonb DEFAULT '{}'::jsonb NOT NULL,
    upsell_enabled boolean DEFAULT true NOT NULL,
    max_discount_percent integer DEFAULT 10 NOT NULL,
    transfer_to_human_on jsonb DEFAULT '["explicit_request","complaint","payment_issue"]'::jsonb NOT NULL,
    after_hours_message text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voice_agent_id uuid NOT NULL,
    user_id uuid,
    direction text DEFAULT 'inbound'::text NOT NULL,
    detected_language text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer DEFAULT 0 NOT NULL,
    outcome text,
    summary text,
    recording_url text,
    mode text DEFAULT 'llm'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.call_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    role text NOT NULL,
    text text NOT NULL,
    language text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.call_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    tool text NOT NULL,
    arguments jsonb DEFAULT '{}'::jsonb NOT NULL,
    result jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Framework tables shared across the fleet (users/devices/payments shape
-- owned by @molecule/api-resource-user — copied verbatim from the donor).
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

--
-- Primary keys
--

ALTER TABLE ONLY public.room_types ADD CONSTRAINT room_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.rooms ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.rate_plans ADD CONSTRAINT rate_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.guests ADD CONSTRAINT guests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reservations ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.voice_agents ADD CONSTRAINT voice_agents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.calls ADD CONSTRAINT calls_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.call_messages ADD CONSTRAINT call_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.call_actions ADD CONSTRAINT call_actions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public."usersSecrets" ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

--
-- Uniques
--

ALTER TABLE ONLY public.rooms ADD CONSTRAINT rooms_number_key UNIQUE (number);
ALTER TABLE ONLY public.reservations ADD CONSTRAINT reservations_confirmation_code_key UNIQUE (confirmation_code);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Indexes
--

CREATE INDEX rooms_room_type_idx ON public.rooms USING btree (room_type_id);
CREATE INDEX rooms_status_idx ON public.rooms USING btree (status);
CREATE INDEX rate_plans_room_type_idx ON public.rate_plans USING btree (room_type_id);
CREATE INDEX reservations_check_in_idx ON public.reservations USING btree (check_in);
CREATE INDEX reservations_check_out_idx ON public.reservations USING btree (check_out);
CREATE INDEX reservations_status_idx ON public.reservations USING btree (status);
CREATE INDEX reservations_guest_id_idx ON public.reservations USING btree (guest_id);
CREATE INDEX reservations_room_type_idx ON public.reservations USING btree (room_type_id);
CREATE INDEX voice_agents_phone_idx ON public.voice_agents USING btree (phone_number);
CREATE INDEX calls_voice_agent_idx ON public.calls USING btree (voice_agent_id);
CREATE INDEX calls_started_at_idx ON public.calls USING btree (started_at DESC);
CREATE INDEX calls_outcome_idx ON public.calls USING btree (outcome);
CREATE INDEX call_messages_call_created_idx ON public.call_messages USING btree (call_id, created_at);
CREATE INDEX call_actions_call_created_idx ON public.call_actions USING btree (call_id, created_at);
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

--
-- Foreign keys
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.rate_plans
    ADD CONSTRAINT rate_plans_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(id);
ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_voice_agent_id_fkey FOREIGN KEY (voice_agent_id) REFERENCES public.voice_agents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.call_messages
    ADD CONSTRAINT call_messages_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.call_actions
    ADD CONSTRAINT call_actions_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;
