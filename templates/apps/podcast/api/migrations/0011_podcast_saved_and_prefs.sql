-- Adds the per-user saved-episodes shelf and a JSON preferences blob
-- referenced by Library, EpisodePlayer, and Settings.
--
-- Why a separate table for saved episodes rather than a flag on
-- listening_progress? Saving and listening are independent actions —
-- a user may save an episode they haven't started, and a position-only
-- progress row shouldn't imply "saved". Keeping them split also lets
-- Library show a clean shelf without filtering out partial-progress
-- noise.

CREATE TABLE IF NOT EXISTS public.saved_episodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    episode_id uuid NOT NULL,
    saved_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

ALTER TABLE ONLY public.saved_episodes
    ADD CONSTRAINT saved_episodes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.saved_episodes
    ADD CONSTRAINT saved_episodes_user_episode_key UNIQUE (user_id, episode_id);

CREATE INDEX IF NOT EXISTS saved_episodes_user_id_idx
    ON public.saved_episodes USING btree (user_id, saved_at DESC);

-- One row per user, holds the JSON blob that Settings.tsx writes and
-- the rest of the app reads (notification toggles, autoplay,
-- playback-rate default, theme override). Using a single jsonb column
-- keeps schema migrations cheap as new prefs are added.
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid NOT NULL,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);
