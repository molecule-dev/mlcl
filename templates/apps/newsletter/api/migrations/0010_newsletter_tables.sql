-- App: newsletter. Baseline domain migration, hand-derived in the shape of
-- the fleet's flagship baselines: framework tables (users, usersSecrets,
-- devices) plus this app's domain tables.
--
-- `mlcl create newsletter` scaffolds this as migration 0010 and the runtime
-- migration runner applies it as a single transaction at first boot.
--
-- Domain model:
--   subscribers        — people on the list (email UNIQUE, status, tier,
--                        source, deterministic unsubscribe token)
--   issues             — newsletter issues (subject + markdown body,
--                        draft/scheduled/published, publish_at/scheduled_at)
--   sends              — per-subscriber delivery log for a published issue
--                        (sent_at/opened_at/clicked_at). This table IS the
--                        "delivery": no real email is sent in this template.
--   issue_stats        — per-issue aggregates (delivered/opened/clicked),
--                        kept in step with sends by the track endpoints.
--   publication_settings — single-row publication identity (name, from-name).

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


CREATE TABLE public.subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(1023) NOT NULL,
    status text DEFAULT 'subscribed'::text NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    source text DEFAULT 'landing'::text,
    token character varying(64) NOT NULL,
    subscribed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    user_id uuid GENERATED ALWAYS AS (author_id) STORED,
    subject text NOT NULL,
    preview_text text,
    body_md text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    publish_at timestamp with time zone,
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.sends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    subscriber_id uuid NOT NULL,
    sent_at timestamp with time zone NOT NULL,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone
);


CREATE TABLE public.issue_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    delivered integer DEFAULT 0 NOT NULL,
    opened integer DEFAULT 0 NOT NULL,
    clicked integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE public.publication_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publication_name text NOT NULL,
    from_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sends
    ADD CONSTRAINT sends_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.issue_stats
    ADD CONSTRAINT issue_stats_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.publication_settings
    ADD CONSTRAINT publication_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_email_key UNIQUE (email);

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_token_key UNIQUE (token);

ALTER TABLE ONLY public.sends
    ADD CONSTRAINT sends_issue_id_subscriber_id_key UNIQUE (issue_id, subscriber_id);

ALTER TABLE ONLY public.issue_stats
    ADD CONSTRAINT issue_stats_issue_id_key UNIQUE (issue_id);


CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");

CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");

CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");

CREATE INDEX "users_email_index" ON public.users USING btree (email);

CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");

CREATE INDEX "users_username_index" ON public.users USING btree (username);

CREATE INDEX subscribers_status_idx ON public.subscribers USING btree (status);

CREATE INDEX subscribers_tier_idx ON public.subscribers USING btree (tier);

CREATE INDEX subscribers_created_at_idx ON public.subscribers USING btree (created_at);

CREATE INDEX issues_author_id_idx ON public.issues USING btree (author_id);

CREATE INDEX issues_status_idx ON public.issues USING btree (status);

CREATE INDEX issues_publish_at_idx ON public.issues USING btree (publish_at);

CREATE INDEX issues_scheduled_at_idx ON public.issues USING btree (scheduled_at);

CREATE INDEX sends_issue_id_idx ON public.sends USING btree (issue_id);

CREATE INDEX sends_subscriber_id_idx ON public.sends USING btree (subscriber_id);

CREATE INDEX sends_opened_at_idx ON public.sends USING btree (opened_at);
