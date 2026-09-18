-- Enforce exactly one notification_preferences row per user.
--
-- Background: the Settings → Notifications toggle test was failing
-- intermittently because two code paths could insert a row for the
-- same user concurrently:
--
--   1. The first /api/shipments request triggers seedDemoForUser(),
--      which `create`s a notification_preferences row with sensible
--      defaults.
--   2. The Settings page's PUT /api/notifications/preferences handler
--      does `findOne(user_id)` → null → `create(...)`. If this fires
--      before the seed's create lands, both inserts succeed and the
--      user ends up with two rows.
--
-- The PUT handler's subsequent updateById uses one row's id, but
-- later GETs (via findOne LIMIT 1) can return the OTHER row, exposing
-- the stale `email_on_exception = true` value the seed wrote — which
-- is exactly what made the toggle look like it didn't persist.
--
-- Fix: collapse any pre-existing duplicates to one row per user
-- (keeping the most recently updated, which represents the user's
-- actual preference), then enforce uniqueness so neither code path
-- can produce a second row again.

-- Step 1: drop duplicates, keeping the row with the latest updated_at
-- (ties broken by created_at, then id, for determinism).
DELETE FROM public.notification_preferences a
USING public.notification_preferences b
WHERE a.user_id = b.user_id
  AND (
    a.updated_at < b.updated_at
    OR (a.updated_at = b.updated_at AND a.created_at < b.created_at)
    OR (a.updated_at = b.updated_at AND a.created_at = b.created_at AND a.id < b.id)
  );

-- Step 2: drop the non-unique helper index in favour of the unique
-- constraint's auto-generated index (PostgreSQL creates one for us).
DROP INDEX IF EXISTS public.notification_preferences_user_id_idx;

-- Step 3: enforce exactly one row per user.
ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);
