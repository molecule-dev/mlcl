-- Per-user app preferences (notification + reading toggles). The shared
-- `users` row is owned by @molecule/api-resource-user, which NEVER returns
-- `oauthData` on reads — so app-level preferences cannot round-trip through
-- the platform user resource. They live here and are served / merged
-- server-side by /api/preferences (see api/src/handlers/preferences.ts).
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
