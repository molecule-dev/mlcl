-- Per-user app preferences for log-viewer (Settings → retention defaults).
--
-- The shared `users` row is owned by @molecule/api-resource-user and its
-- read shape NEVER returns `oauthData`, so retention prefs persisted there
-- by the Settings page silently reset on every reload. Preferences now
-- live in their own table and round-trip through GET/PATCH /api/preferences
-- (the fleet pattern: expense-report 0012_user_preferences).
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid PRIMARY KEY,
    hot_retention_days integer DEFAULT 30 NOT NULL,
    cold_retention_days integer DEFAULT 365 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
