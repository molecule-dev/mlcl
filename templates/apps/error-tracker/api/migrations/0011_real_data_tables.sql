-- Phase 5 migration for error-tracker. Extends the bare 0010 schema with
-- per-user tables and columns the polished UI needs to render real data
-- (instead of FALLBACK_* / hardcoded arrays). Every row is user-scoped
-- (or scoped via a user-owned parent id), so the IDOR-safety pattern in
-- handlers extends naturally.

-- notifications: 0010 defined only id/createdAt/updatedAt. Add the
-- columns the activity feed actually renders.
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS user_id uuid,
    ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'status',
    ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS detail text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS href text,
    ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON public.notifications USING btree (user_id, created_at DESC);

-- team_members: extend with display fields the Team page renders inline,
-- so we don't have to join on a directory/users table.
ALTER TABLE public.team_members
    ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS oncall boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS member_status text NOT NULL DEFAULT 'resolved',
    ADD COLUMN IF NOT EXISTS last_active text NOT NULL DEFAULT 'just now';

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

-- Slack/PagerDuty/etc connection state (Settings page).
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

-- Pending invite rows for the Team page invite flow.
CREATE TABLE IF NOT EXISTS public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member',
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT team_invites_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS team_invites_user_idx
    ON public.team_invites USING btree (user_id);

-- Issue stack-trace frames + exception fields (IssueDetail page renders
-- a real stack with vendor/app frames + context lines). Keep frames as
-- jsonb so we don't have a frames-of-issue child table for V1.
ALTER TABLE public.issues
    ADD COLUMN IF NOT EXISTS exception_type text,
    ADD COLUMN IF NOT EXISTS exception_value text,
    ADD COLUMN IF NOT EXISTS frames jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Releases need adoption %, commit list, file count, health label that
-- the polished cards render. 0010 already has commits + commit_sha; add
-- the rest.
ALTER TABLE public.releases
    ADD COLUMN IF NOT EXISTS files integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS health text NOT NULL DEFAULT 'healthy',
    ADD COLUMN IF NOT EXISTS adoption jsonb NOT NULL DEFAULT '[]'::jsonb;
