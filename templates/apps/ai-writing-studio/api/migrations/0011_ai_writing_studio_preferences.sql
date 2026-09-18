-- ai-writing-studio: per-user writing preferences (tone preset, autosave,
-- inline AI suggestions). Persisted as a single row per user so the
-- Settings page can save + reload them without bloating the users table.
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    default_tone text DEFAULT 'Professional'::text NOT NULL,
    auto_save boolean DEFAULT true NOT NULL,
    ai_suggestions boolean DEFAULT true NOT NULL,
    notify_email boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.user_preferences
    DROP CONSTRAINT IF EXISTS user_preferences_pkey;

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_uniq
    ON public.user_preferences USING btree (user_id);
