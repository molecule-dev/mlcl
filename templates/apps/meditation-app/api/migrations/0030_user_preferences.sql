-- meditation-app: per-user preferences (default voice, session length, daily
-- reminder, autoplay, weekly goal). One row per user, lazily inserted on
-- first PUT /api/preferences. The handler also returns DEFAULTS when no row
-- exists yet, so reads never depend on this row being present.

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    voice text DEFAULT 'maya' NOT NULL,
    default_duration_minutes integer DEFAULT 10 NOT NULL,
    reminder_enabled boolean DEFAULT true NOT NULL,
    reminder_time text DEFAULT '07:30' NOT NULL,
    autoplay_next boolean DEFAULT false NOT NULL,
    weekly_goal_minutes integer DEFAULT 120 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON public.user_preferences USING btree (user_id);
