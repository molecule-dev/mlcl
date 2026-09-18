-- Design canvas: notifications + design_tokens + user_preferences
-- Added on top of 0010 baseline so a user lands on a populated app.

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    actor_name text,
    actor_color text,
    sentence text,
    target_label text,
    target_href text,
    preview text,
    bucket text NOT NULL DEFAULT 'today',
    unread boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON public.notifications USING btree (user_id, unread);

CREATE TABLE IF NOT EXISTS public.design_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    section text NOT NULL,
    name text NOT NULL,
    value text NOT NULL,
    role text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS design_tokens_section_idx
    ON public.design_tokens USING btree (section);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid NOT NULL PRIMARY KEY,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- thumbnail_color so dashboards can render varied tiles without a real
-- thumbnail asset. Nullable to keep existing rows valid.
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS thumbnail_color text;

-- description column used by templates UI (subtitle under the title).
ALTER TABLE public.templates
    ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.templates
    ADD COLUMN IF NOT EXISTS accent_color text;
ALTER TABLE public.templates
    ADD COLUMN IF NOT EXISTS icon_name text;
ALTER TABLE public.templates
    ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0 NOT NULL;
