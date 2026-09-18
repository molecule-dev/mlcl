-- ai-data-analyst migration 0011 — settings + api keys
--
-- Adds:
-- * `api_keys`        — programmatic-access tokens (Settings → API Keys tab).
-- * `user_settings`   — per-user preferences + integration connections
--                      (Settings → Account & Integrations tabs).
--
-- Plus column extensions on existing tables:
-- * `notifications.entity_id`  — link target for FE href derivation.
-- * `datasets.metadata_json`   — denormalized statistics + ai_insights cache.
-- * `saved_reports.metadata_json` — rendered hero/sub_charts/data_table cache.
-- * `dataset_columns.stats_json`  — per-column min/max/mean/null_pct cache.

-- ---------------------------------------------------------------------------
-- api_keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    key_masked text NOT NULL,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.api_keys DROP CONSTRAINT IF EXISTS api_keys_pkey;
ALTER TABLE ONLY public.api_keys ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx
    ON public.api_keys USING btree (user_id);

CREATE INDEX IF NOT EXISTS api_keys_user_revoked_idx
    ON public.api_keys USING btree (user_id, revoked_at);

-- ---------------------------------------------------------------------------
-- user_settings — preferences + integrations + notification opts.
-- One row per user. Created lazily by the settings handler on first PATCH.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id uuid NOT NULL,
    organization text DEFAULT ''::text NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    integrations jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
ALTER TABLE ONLY public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);

-- ---------------------------------------------------------------------------
-- notifications: add entity_id so the handler can derive a /datasets/:id or
-- /reports/:id link without parsing the body string.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS entity_id uuid;

-- ---------------------------------------------------------------------------
-- datasets: cache derived UI shape (statistics, ai_insights summary) so the
-- DatasetDetail handler doesn't have to recompute it on every read.
-- ---------------------------------------------------------------------------
ALTER TABLE public.datasets
    ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL;

-- ---------------------------------------------------------------------------
-- saved_reports: hero/kpis/sub_charts/ai_summary/data_table live in
-- layout_json today as a flat array; metadata_json holds the projection
-- shape ReportDetail.tsx expects so we don't have to overload layout_json.
-- ---------------------------------------------------------------------------
ALTER TABLE public.saved_reports
    ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL;

-- ---------------------------------------------------------------------------
-- dataset_columns: per-column stats (min/max/mean/null_pct) used by
-- DatasetDetail.tsx Statistics tab.
-- ---------------------------------------------------------------------------
ALTER TABLE public.dataset_columns
    ADD COLUMN IF NOT EXISTS stats_json jsonb DEFAULT '{}'::jsonb NOT NULL;
