-- Per-user notification + reminder preferences for the Settings page.
-- Added 2026-05-08 alongside the wiring of Settings → /api/users/me/preferences.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_time text NOT NULL DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS streak_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_digest_enabled boolean NOT NULL DEFAULT false;
