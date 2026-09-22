-- Per-user fleet settings (organization profile, alert thresholds,
-- notification preferences).
--
-- The platform user resource never returns `oauthData` on reads, so the
-- Settings page cannot persist its slice there — it needs a server-side
-- channel. One row per owner, lazily created on first PATCH.
--
-- Idempotent so re-running the migration on an existing DB is safe.

CREATE TABLE IF NOT EXISTS public.fleet_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS fleet_settings_owner_id_key
    ON public.fleet_settings USING btree (owner_id);
