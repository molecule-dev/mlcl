-- Per-user state + display enrichment columns the v1 schema (0010)
-- omitted. Adding here so handlers can return rows shaped the way the
-- React pages already consume (label, description, cover_url, cover_index,
-- and aggregated counters that survive reload).

ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS cover_index integer DEFAULT 1 NOT NULL;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS track_count integer DEFAULT 0 NOT NULL;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0 NOT NULL;

ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS follower_count integer DEFAULT 0 NOT NULL;

ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS cover_index integer DEFAULT 1 NOT NULL;
-- Stable demo audio URLs are short same-site relative paths served by
-- /api/tracks/:id/stream so playback works during smoke tests without
-- depending on any external CDN.

ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS cover_index integer DEFAULT 1 NOT NULL;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS created_by_name text;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS href text;

ALTER TABLE public.queue_items ADD COLUMN IF NOT EXISTS origin text DEFAULT 'queue' NOT NULL;
ALTER TABLE public.queue_items ADD COLUMN IF NOT EXISTS source_kind text;
ALTER TABLE public.queue_items ADD COLUMN IF NOT EXISTS source_id text;

ALTER TABLE public.radio_stations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.radio_stations ADD COLUMN IF NOT EXISTS cover_index integer DEFAULT 1 NOT NULL;

-- Follow relations (artist follows + user-to-user follows).
CREATE TABLE IF NOT EXISTS public.artist_follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    artist_id uuid NOT NULL,
    followed_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone,
    PRIMARY KEY (id),
    UNIQUE (user_id, artist_id)
);
CREATE INDEX IF NOT EXISTS artist_follows_user_id_idx ON public.artist_follows USING btree (user_id);
CREATE INDEX IF NOT EXISTS artist_follows_artist_id_idx ON public.artist_follows USING btree (artist_id);

CREATE TABLE IF NOT EXISTS public.playlist_saves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    playlist_id uuid NOT NULL,
    saved_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone,
    PRIMARY KEY (id),
    UNIQUE (user_id, playlist_id)
);
CREATE INDEX IF NOT EXISTS playlist_saves_user_id_idx ON public.playlist_saves USING btree (user_id);

-- Per-user playback state (now-playing + transport).
CREATE TABLE IF NOT EXISTS public.user_playback (
    user_id uuid PRIMARY KEY,
    track_id uuid,
    position_seconds integer DEFAULT 0 NOT NULL,
    is_playing boolean DEFAULT false NOT NULL,
    is_shuffled boolean DEFAULT false NOT NULL,
    repeat_mode text DEFAULT 'off' NOT NULL,
    volume integer DEFAULT 80 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Per-user preferences (the Settings page's toggles + selects).
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid PRIMARY KEY,
    display_name text,
    country text,
    audio_quality text DEFAULT 'lossless' NOT NULL,
    crossfade boolean DEFAULT true NOT NULL,
    gapless boolean DEFAULT true NOT NULL,
    normalize boolean DEFAULT true NOT NULL,
    allow_explicit boolean DEFAULT true NOT NULL,
    public_profile boolean DEFAULT true NOT NULL,
    public_listening boolean DEFAULT false NOT NULL,
    allow_followers boolean DEFAULT true NOT NULL,
    share_listening boolean DEFAULT false NOT NULL,
    notify_new_releases boolean DEFAULT true NOT NULL,
    notify_weekly_recap boolean DEFAULT true NOT NULL,
    notify_follower_activity boolean DEFAULT false NOT NULL,
    notify_concert_nearby boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
