-- Per-user workspace preferences for ai-agent-playground.
--
-- The molecule user resource intentionally locks down the user props
-- schema (username/name/email/oauth/plan only). Anything app-specific
-- (default provider, default model, timezone, display name overrides,
-- bio, etc.) lives here. One row per user; upserted via
-- `PUT /api/user-preferences` (or `PATCH /api/users/:id` which the
-- ai-agent-playground app routes to the same handler under the hood).
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_uniq
    ON public.user_preferences USING btree (user_id);
