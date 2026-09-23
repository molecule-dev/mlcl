-- Per-user preferences storage for the settings + profile pages.
--
-- The platform user resource never returns `oauthData` on reads, so client
-- blobs written via PATCH /users/:id were write-only. This table is the
-- server-side channel those pages read back from (GET/PATCH /api/preferences,
-- handlers/preferences.ts). One row per user, lazily created on first PATCH.
-- Idempotent — safe to re-apply.

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid NOT NULL PRIMARY KEY,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
