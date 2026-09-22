-- Per-user app preferences (default warehouse, integration link states).
--
-- The shared `users` row is owned by the platform user resource, which never
-- returns app-specific `oauthData` on reads — so preferences that must survive
-- a reload live in OUR OWN table and are served by GET/PATCH /api/preferences
-- (handlers/preferences.ts merges the patch server-side).
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL UNIQUE,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
