-- Auxiliary tables for messaging-app.
--
-- 0010 captured the canonical chat schema (conversations, messages,
-- contacts, groups, …). Subsequent dispatch work adds:
--
--   - public.notifications: backend for the /api/notifications page
--   - public.user_preferences: jsonb blob backing /api/profile/preferences
--
-- Both are scoped per-user with a strict (user_id) partition.

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_pkey'
    ) THEN
        ALTER TABLE ONLY public.notifications
            ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
    ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
    ON public.notifications USING btree (user_id) WHERE read_at IS NULL;

-- One row per user; settings/profile pages PATCH the JSON blob.
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid NOT NULL,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_pkey'
    ) THEN
        ALTER TABLE ONLY public.user_preferences
            ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);
    END IF;
END $$;
