-- App: family-tree. Domain baseline migration.
--
-- Framework tables (users / usersSecrets / devices) mirror the fleet-standard
-- auth schema; domain tables:
--   people        — one row per family member (person record).
--   relationships — directed edges between people. kind = 'parent' means
--                   from_person's parent IS to_person (child -> parent);
--                   kind = 'partner' is an undirected spousal edge stored once.
--                   Children and siblings are DERIVED (shared parents) in
--                   handlers/_graph.ts — never stored as their own edges.
CREATE TABLE public.people (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text,
    maiden_name text,
    gender text,
    birth_date date,
    birth_place text,
    death_date date,
    death_place text,
    notes text,
    photo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

CREATE TABLE public.relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    from_person uuid NOT NULL,
    to_person uuid NOT NULL,
    kind text DEFAULT 'parent'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
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

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

CREATE INDEX idx_people_user_name ON public.people USING btree (user_id, last_name, first_name);

CREATE INDEX idx_people_user_birth ON public.people USING btree (user_id, birth_date);

CREATE INDEX idx_relationships_user ON public.relationships USING btree (user_id);

CREATE INDEX idx_relationships_from ON public.relationships USING btree (from_person);

CREATE INDEX idx_relationships_to ON public.relationships USING btree (to_person);

CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");

CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");

CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");

CREATE INDEX users_email_index ON public.users USING btree (email);

CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");

CREATE INDEX users_username_index ON public.users USING btree (username);
