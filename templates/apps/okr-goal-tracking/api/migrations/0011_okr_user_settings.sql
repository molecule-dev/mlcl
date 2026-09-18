-- okr-goal-tracking migration 0011 — per-user preferences.
--
-- Adds:
-- * `user_settings` — one row per user, lazily created on first PATCH.
--   Stores cadence + notification toggle preferences shown on /settings.
--
-- Cadence column is materialised separately so the API can index/filter
-- on it; everything else (toggles, future preferences) lives in the
-- preferences jsonb blob.

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id uuid NOT NULL,
    cadence character varying(32) DEFAULT 'weekly'::character varying NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
ALTER TABLE ONLY public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_settings
    DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
