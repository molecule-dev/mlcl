-- Per-user app preferences (notification + reading toggles).
--
-- The platform user resource never returns `oauthData` on reads, so the
-- Settings page cannot persist preference toggles through PATCH
-- /users/:id — the values vanish on reload. This table is the server-side
-- slice the Settings page owns: GET/PATCH /api/settings read and merge it.
CREATE TABLE public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

CREATE INDEX idx_user_settings_user_id ON public.user_settings USING btree (user_id);
