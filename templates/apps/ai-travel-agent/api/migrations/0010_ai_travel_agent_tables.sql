-- App: ai-travel-agent. Baseline schema, applied as one transaction at first boot.
--
-- Platform tables (users, usersSecrets, devices, payments) follow the shapes the
-- @molecule/api-resource-* packages write. The rest is this app's own domain:
--   conversations / messages  one voice or text session with the agent
--   flights                    the seeded flight inventory the agent searches when
--                              no flights provider (Amadeus) is configured
--   trips / bookings           what the agent booked, and what happened to it
--   bill_splits                per-person shares of a booking, each with a pay link
--   notifications              in-app copies of everything the agent tells the user

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

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    total_seconds_spoken integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'text'::text NOT NULL,
    -- The agent's tool calls for this turn: [{ name, input, result, isError }].
    tool_calls jsonb DEFAULT '[]'::jsonb NOT NULL,
    duration_ms integer,
    latency_ms integer,
    tokens_used integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- One row per scheduled flight on a date. Searched directly when no flights
-- provider is bonded; also the source of truth for delays in that mode.
CREATE TABLE public.flights (
    id text NOT NULL,
    airline text NOT NULL,
    airline_code text NOT NULL,
    flight_number text NOT NULL,
    origin_iata text NOT NULL,
    origin_city text,
    destination_iata text NOT NULL,
    destination_city text,
    depart_date date NOT NULL,
    depart_at timestamp with time zone NOT NULL,
    arrive_at timestamp with time zone NOT NULL,
    duration_minutes integer NOT NULL,
    stops integer DEFAULT 0 NOT NULL,
    stop_airports jsonb DEFAULT '[]'::jsonb NOT NULL,
    cabin text DEFAULT 'economy'::text NOT NULL,
    price_cents integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    aircraft text,
    seats_left integer DEFAULT 9 NOT NULL,
    -- scheduled | delayed | cancelled
    status text DEFAULT 'scheduled'::text NOT NULL,
    delay_minutes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    conversation_id uuid,
    title text DEFAULT ''::text NOT NULL,
    origin_iata text,
    destination_iata text,
    depart_date date,
    traveler_count integer DEFAULT 1 NOT NULL,
    -- planned | booked | rebooked | cancelled
    status text DEFAULT 'planned'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- A booked itinerary snapshot. Provider offer ids are short-lived, so every
-- field the user needs later is copied here at booking time.
CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    trip_id uuid,
    conversation_id uuid,
    flight_id text,
    -- inventory | provider
    source text DEFAULT 'inventory'::text NOT NULL,
    confirmation_code text NOT NULL,
    -- booked | delayed | rebooked | cancelled
    status text DEFAULT 'booked'::text NOT NULL,
    airline text NOT NULL,
    flight_number text NOT NULL,
    origin_iata text NOT NULL,
    destination_iata text NOT NULL,
    depart_at timestamp with time zone NOT NULL,
    arrive_at timestamp with time zone NOT NULL,
    cabin text DEFAULT 'economy'::text NOT NULL,
    passenger_count integer DEFAULT 1 NOT NULL,
    traveler_names jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_cents integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    card_last4 text,
    payment_intent_id text,
    delay_minutes integer DEFAULT 0 NOT NULL,
    rebooked_from_id uuid,
    rebooked_to_id uuid,
    booked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- One person's share of a booking. `pay_token` is the public pay-link key.
CREATE TABLE public.bill_splits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    contact text,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    -- pending | paid
    status text DEFAULT 'pending'::text NOT NULL,
    pay_token text NOT NULL,
    notified_at timestamp with time zone,
    paid_at timestamp with time zone,
    card_last4 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    link text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public."usersSecrets" ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.flights ADD CONSTRAINT flights_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.trips ADD CONSTRAINT trips_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bookings ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bookings ADD CONSTRAINT bookings_confirmation_code_key UNIQUE (confirmation_code);
ALTER TABLE ONLY public.bill_splits ADD CONSTRAINT bill_splits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bill_splits ADD CONSTRAINT bill_splits_pay_token_key UNIQUE (pay_token);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");
CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");
CREATE INDEX users_email_index ON public.users USING btree (email);
CREATE INDEX users_username_index ON public.users USING btree (username);
CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");
CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");
CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");
CREATE INDEX "payments_createdAt_index" ON public.payments USING btree ("createdAt");
CREATE INDEX "payments_platformKey_index" ON public.payments USING btree ("platformKey");
CREATE INDEX "payments_productId_index" ON public.payments USING btree ("productId");
CREATE INDEX "payments_transactionId_index" ON public.payments USING btree ("transactionId");
CREATE INDEX "payments_updatedAt_index" ON public.payments USING btree ("updatedAt");
CREATE INDEX "payments_userId_index" ON public.payments USING btree ("userId");
CREATE INDEX conversations_user_started_idx ON public.conversations USING btree (user_id, started_at DESC);
CREATE INDEX messages_conversation_created_idx ON public.messages USING btree (conversation_id, created_at);
CREATE INDEX flights_route_date_idx ON public.flights USING btree (origin_iata, destination_iata, depart_date);
CREATE INDEX flights_depart_at_idx ON public.flights USING btree (depart_at);
CREATE INDEX trips_user_idx ON public.trips USING btree (user_id, created_at DESC);
CREATE INDEX bookings_user_idx ON public.bookings USING btree (user_id, depart_at);
CREATE INDEX bookings_trip_idx ON public.bookings USING btree (trip_id);
CREATE INDEX bookings_status_depart_idx ON public.bookings USING btree (status, depart_at);
CREATE INDEX bill_splits_booking_idx ON public.bill_splits USING btree (booking_id);
CREATE INDEX bill_splits_user_idx ON public.bill_splits USING btree (user_id);
CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id);
CREATE INDEX notifications_user_read_idx ON public.notifications USING btree (user_id, read_at);
