-- Additive feature migration for ci-cd-dashboard.
--
-- 0010 squashed the initial schema but the notifications table was
-- created with only id/createdAt/updatedAt — usable for the resource
-- bond to register, but missing every column the in-app Notifications
-- page reads. This migration brings that schema up to spec without
-- touching 0010 (so fresh scaffolds and existing dbs end up in the
-- same place via idempotent ADD COLUMN IF NOT EXISTS / CREATE TABLE
-- IF NOT EXISTS). It also adds two new tables — repository_secrets
-- and outgoing_webhooks — that back the Settings page (Secrets and
-- Webhooks sections), replacing the previous placeholder UI.

-- ---------------------------------------------------------------- notifications

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'system';

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '';

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS href text;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS unread boolean NOT NULL DEFAULT true;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
    ON public.notifications USING btree (user_id);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON public.notifications USING btree (user_id, unread);

-- ---------------------------------------------------------------- repository_secrets

CREATE TABLE IF NOT EXISTS public.repository_secrets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    repository_id uuid,
    name text NOT NULL,
    scope text NOT NULL DEFAULT 'env',
    value_preview text NOT NULL DEFAULT '',
    last_used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repository_secrets_user_id_idx
    ON public.repository_secrets USING btree (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS repository_secrets_user_name_uidx
    ON public.repository_secrets USING btree (user_id, name);

-- ---------------------------------------------------------------- outgoing_webhooks

CREATE TABLE IF NOT EXISTS public.outgoing_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    repository_id uuid,
    name text NOT NULL DEFAULT '',
    url text NOT NULL,
    events jsonb NOT NULL DEFAULT '[]'::jsonb,
    active boolean NOT NULL DEFAULT true,
    last_delivery_at timestamp with time zone,
    last_delivery_status text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outgoing_webhooks_user_id_idx
    ON public.outgoing_webhooks USING btree (user_id);

-- ---------------------------------------------------------------- artifacts type column
-- Frontend Artifacts page needs a `type` column to pick the icon.

ALTER TABLE public.artifacts
    ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'binary';

-- ---------------------------------------------------------------- builds enrichment
-- Frontend PipelineRow expects commit author + message + duration on the
-- pipeline row itself; the pipeline now decorates from latest build, so
-- ensure these columns exist on builds (they do via 0010 but defensive
-- additions are cheap).

ALTER TABLE public.builds
    ADD COLUMN IF NOT EXISTS coverage_pct numeric;
