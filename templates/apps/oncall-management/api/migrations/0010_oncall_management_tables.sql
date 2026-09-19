-- App: oncall-management (Klaxon). Baseline schema, single replayable file.
--
-- Layout:
--   - framework tables (users, usersSecrets, devices) — copied verbatim from
--     the fleet's user/device resource packages
--   - notifications / team_members / team_invites / user_api_keys /
--     user_sessions_view / connected_accounts / org_settings /
--     org_integrations — the shared account+workspace surfaces every
--     flagship renders
--   - domain tables: schedules, schedule_shifts, escalation_policies,
--     escalation_rules, incidents, incident_events, postmortems,
--     postmortem_action_items
--
-- Every domain row is user-scoped (user_id = workspace owner), so handlers
-- authorize with the same user_id predicate pattern as the fleet.

-- ============================================================ framework

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
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public."usersSecrets" (
    id uuid NOT NULL,
    "passwordHash" text,
    "passwordResetToken" text,
    "passwordResetTokenAt" timestamp with time zone,
    "pendingTwoFactorSecret" text,
    "twoFactorSecret" text,
    CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id)
);

CREATE TABLE public.devices (
    id uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid NOT NULL,
    name text,
    "pushPlatform" text,
    "pushSubscription" jsonb,
    "hasPushSubscription" boolean,
    CONSTRAINT devices_pkey PRIMARY KEY (id)
);

-- ====================================================== account surfaces

-- In-app paging feed. The notifications resource owns the base shape; the
-- activity/paging columns are what the Notifications page renders.
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    kind text NOT NULL DEFAULT 'status',
    severity text NOT NULL DEFAULT 'info',
    title text NOT NULL DEFAULT '',
    detail text NOT NULL DEFAULT '',
    href text,
    read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON public.notifications USING btree (user_id, created_at DESC);

-- Responders roster. member_id is a synthetic uuid for per-user demo rows;
-- name/email/timezone render inline so no directory join is needed.
CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    member_id uuid NOT NULL,
    name text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    role text NOT NULL DEFAULT 'responder',
    timezone text NOT NULL DEFAULT 'UTC',
    oncall boolean NOT NULL DEFAULT false,
    member_status text NOT NULL DEFAULT 'active',
    assigned_incidents integer NOT NULL DEFAULT 0,
    acked_30d integer NOT NULL DEFAULT 0,
    resolved_30d integer NOT NULL DEFAULT 0,
    last_active text NOT NULL DEFAULT 'just now',
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_members_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS team_members_user_idx
    ON public.team_members USING btree (user_id);

CREATE TABLE IF NOT EXISTS public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'responder',
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT team_invites_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS team_invites_user_idx
    ON public.team_invites USING btree (user_id);

-- Personal API keys (Profile page).
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    prefix text NOT NULL,
    last_used_at timestamp with time zone,
    last_used_label text NOT NULL DEFAULT 'never',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    revoked_at timestamp with time zone,
    CONSTRAINT user_api_keys_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS user_api_keys_user_idx
    ON public.user_api_keys USING btree (user_id);

-- Active browser sessions (Profile page).
CREATE TABLE IF NOT EXISTS public.user_sessions_view (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_agent text NOT NULL DEFAULT '',
    ip_address text,
    city text,
    is_current boolean NOT NULL DEFAULT false,
    last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_sessions_view_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS user_sessions_view_user_idx
    ON public.user_sessions_view USING btree (user_id);

-- OAuth provider links shown on Profile.
CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_username text,
    connected boolean NOT NULL DEFAULT false,
    connected_at timestamp with time zone,
    CONSTRAINT connected_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT connected_accounts_user_provider_uniq UNIQUE (user_id, provider)
);

-- Single-row workspace settings (Settings page).
CREATE TABLE IF NOT EXISTS public.org_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_name text NOT NULL DEFAULT '',
    region text NOT NULL DEFAULT 'us-east-1',
    retention_days integer NOT NULL DEFAULT 30,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT org_settings_pkey PRIMARY KEY (id),
    CONSTRAINT org_settings_user_uniq UNIQUE (user_id)
);

-- Slack/webhook/etc connection state (Settings page).
CREATE TABLE IF NOT EXISTS public.org_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    detail text NOT NULL DEFAULT '',
    connected boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT org_integrations_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS org_integrations_user_idx
    ON public.org_integrations USING btree (user_id);

-- ========================================================== domain: oncall

-- Rotation schedules. members is the ordered responder rotation (array of
-- team_members ids, rotation order); cadence is rotation_type (daily |
-- weekly) with handoff_time (HH:MM, interpreted as UTC in V1 — the
-- timezone column is display metadata; see handlers/schedules.ts).
CREATE TABLE public.schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    timezone text NOT NULL DEFAULT 'UTC',
    rotation_type text NOT NULL DEFAULT 'weekly',
    handoff_time text NOT NULL DEFAULT '09:00',
    members jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schedules_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS schedules_user_idx ON public.schedules USING btree (user_id);

-- Materialized rotation shifts (start inclusive, end exclusive). Coverage
-- calendar + "who is on call now" read these; overrides (holiday cover,
-- swaps) are is_override rows that take precedence over rotation rows in
-- the same window.
CREATE TABLE public.schedule_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    schedule_id uuid NOT NULL,
    member_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    is_override boolean NOT NULL DEFAULT false,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schedule_shifts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS schedule_shifts_schedule_idx
    ON public.schedule_shifts USING btree (schedule_id, start_at);
CREATE INDEX IF NOT EXISTS schedule_shifts_window_idx
    ON public.schedule_shifts USING btree (start_at, end_at);

-- Escalation policies: an ordered rule ladder. Each rule pages one member
-- (or a notification channel) and then waits wait_minutes before the next
-- rule fires. repeat_cycles is how many times the whole ladder repeats
-- before the incident goes unacknowledged-for-real.
CREATE TABLE public.escalation_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    repeat_cycles integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT escalation_policies_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS escalation_policies_user_idx
    ON public.escalation_policies USING btree (user_id);

CREATE TABLE public.escalation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    policy_id uuid NOT NULL,
    position integer NOT NULL DEFAULT 0,
    notify_member_id uuid,
    notify_channel text,
    wait_minutes integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT escalation_rules_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS escalation_rules_policy_idx
    ON public.escalation_rules USING btree (policy_id, position);

-- Incidents. severity: critical | warning | info. status: triggered ->
-- acknowledged -> resolved (re-open returns to triggered).
CREATE TABLE public.incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    severity text NOT NULL DEFAULT 'warning',
    status text NOT NULL DEFAULT 'triggered',
    service text NOT NULL DEFAULT '',
    assigned_member_id uuid,
    escalation_policy_id uuid,
    schedule_id uuid,
    escalation_level integer NOT NULL DEFAULT 0,
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    acked_at timestamp with time zone,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT incidents_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS incidents_user_status_idx
    ON public.incidents USING btree (user_id, status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS incidents_user_triggered_idx
    ON public.incidents USING btree (user_id, triggered_at DESC);

-- Append-only incident timeline. kind: trigger | ack | resolve | note |
-- escalate | assign. actor is the display name (the paging user, a
-- responder, or "system").
CREATE TABLE public.incident_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    kind text NOT NULL,
    actor text NOT NULL DEFAULT 'system',
    text text NOT NULL DEFAULT '',
    at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT incident_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS incident_events_incident_idx
    ON public.incident_events USING btree (incident_id, at);

-- Postmortems: one per resolved (or resolving) incident. contributing_factors
-- is a jsonb string array; action items live in their own table so owners and
-- statuses can be updated independently.
CREATE TABLE public.postmortems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    title text NOT NULL,
    summary text NOT NULL DEFAULT '',
    contributing_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT postmortems_pkey PRIMARY KEY (id),
    CONSTRAINT postmortems_incident_uniq UNIQUE (incident_id)
);

CREATE INDEX IF NOT EXISTS postmortems_user_idx ON public.postmortems USING btree (user_id);

CREATE TABLE public.postmortem_action_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    postmortem_id uuid NOT NULL,
    description text NOT NULL,
    owner_member_id uuid,
    status text NOT NULL DEFAULT 'open',
    due_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT postmortem_action_items_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS postmortem_action_items_postmortem_idx
    ON public.postmortem_action_items USING btree (postmortem_id);
