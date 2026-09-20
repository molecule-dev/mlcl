-- App: civic-311 (CivicPulse — SeeClickFix-like civic issue reporter for the
-- fictional City of Riverton).
--
-- Framework tables (users, usersSecrets, devices) match the fleet baseline.
-- Domain tables:
--   issues         — one reported civic issue (category, status, photo ref,
--                    map pin x/y + derived_address, official note)
--   issue_events   — the issue timeline: status changes, official response
--                    notes, and citizen comments (kind discriminates)
--   confirmations  — "me too" +1s on someone else's issue (UNIQUE issue+user)
--   watch_areas    — saved named circles (center x/y + radius in blocks);
--                    new issues inside a watcher's area fan out notifications
--   notifications  — in-app feed rows (watch-area hits, status changes,
--                    confirmations on your reports)
--
-- Map coordinates: x and y are positions on the city's 100x100 street grid
-- (one unit = one block). See api/src/lib/geo.ts for the deterministic
-- "3rd Ave & E 12th St" address derivation — the grid is fictional, so no
-- geocoding service is involved anywhere in this template.

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
    "planAutoRenews" boolean DEFAULT false,
    role text DEFAULT 'resident'::text NOT NULL
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
    pushPlatform text,
    pushSubscription jsonb,
    "hasPushSubscription" boolean
);

CREATE TABLE public.issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    photo_url text,
    x double precision NOT NULL,
    y double precision NOT NULL,
    derived_address text NOT NULL,
    official_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);

CREATE TABLE public.issue_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    kind text NOT NULL,
    actor_id uuid NOT NULL,
    text text,
    from_status text,
    to_status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.confirmations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.watch_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL,
    radius double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    issue_id uuid,
    message text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.issue_events
    ADD CONSTRAINT issue_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.confirmations
    ADD CONSTRAINT confirmations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.watch_areas
    ADD CONSTRAINT watch_areas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.confirmations
    ADD CONSTRAINT confirmations_issue_id_user_id_key UNIQUE (issue_id, user_id);

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");
CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");
CREATE INDEX "users_username_index" ON public.users USING btree (username);
CREATE INDEX users_email_index ON public.users USING btree (email);

CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");
CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");
CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");

CREATE INDEX issues_reporter_id_idx ON public.issues USING btree (reporter_id);
CREATE INDEX issues_category_idx ON public.issues USING btree (category);
CREATE INDEX issues_status_idx ON public.issues USING btree (status);
CREATE INDEX issues_created_at_idx ON public.issues USING btree (created_at);

CREATE INDEX issue_events_issue_id_idx ON public.issue_events USING btree (issue_id);
CREATE INDEX issue_events_created_at_idx ON public.issue_events USING btree (created_at);

CREATE INDEX confirmations_issue_id_idx ON public.confirmations USING btree (issue_id);
CREATE INDEX confirmations_user_id_idx ON public.confirmations USING btree (user_id);

CREATE INDEX watch_areas_user_id_idx ON public.watch_areas USING btree (user_id);

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);
CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at);
