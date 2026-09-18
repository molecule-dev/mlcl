-- Broken-access-control fix: shared-league catalog writes (schedule, scores,
-- players, game events, team roster/edit) must be gated behind a league-operator
-- (admin) role, not merely an authenticated session. The require-admin middleware
-- treats `role = 'admin'` (or an email on the ADMIN_EMAILS allow-list, lazily
-- promoted) as the league operator; everyone else defaults to 'user'.
-- Idempotent ALTER so it applies to fresh + already-provisioned users tables.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user';
