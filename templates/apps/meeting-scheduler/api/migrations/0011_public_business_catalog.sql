-- Public business booking catalog (fleet audit 2026-09-27).
--
-- Gives every deployment a signed-out booking surface that works on a fresh
-- production database: a business catalog of bookable services with prices
-- plus business hours, seeded here instead of hand-created in a dev database
-- (the m010 failure class: services existed only in dev and were deleted as
-- "cleanup" before production).
--
-- The catalog is owned by a SYSTEM account (owner@scheduler.local, no
-- usersSecrets row — it cannot be logged into). Public endpoints read it;
-- the first real account that signs up sees its bookings on the owner page
-- via the system-owner inclusion in GET /api/bookings.

-- Service prices (the public catalog shows name / duration / price).
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0;

DO $$
DECLARE
  sys_id uuid;
BEGIN
  -- The system business owner. No usersSecrets row is created, so this
  -- account has no password and cannot be logged into.
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'owner@scheduler.local') THEN
    INSERT INTO users (id, email, name)
    VALUES (gen_random_uuid(), 'owner@scheduler.local', 'Business owner');
  END IF;

  SELECT id INTO sys_id FROM users WHERE email = 'owner@scheduler.local';

  -- Default service catalog (idempotent: only seed an empty catalog so a
  -- builder's own services are never overwritten).
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE owner_id = sys_id) THEN
    INSERT INTO event_types
        (owner_id, name, slug, description, duration_minutes, price_cents, is_active, "position")
    VALUES
        (sys_id, 'Quick chat', 'quick-chat',
         'A short intro call to see if we are a good fit.', 15, 0, true, 0),
        (sys_id, 'Standard meeting', 'standard-meeting',
         'A standard 30-minute meeting.', 30, 4000, true, 1),
        (sys_id, 'Deep-dive session', 'deep-dive-session',
         'A full hour of undivided attention.', 60, 12000, true, 2);
  END IF;

  -- Business hours as data: Tue–Sat, 09:00–17:00 (Sun/Mon closed). The
  -- public availability endpoints read these rules; builders edit them via
  -- the owner availability page or a new seed.
  INSERT INTO availability_rules (user_id, day_of_week, start_minute, end_minute, timezone)
  SELECT sys_id, d.dow, 540, 1020, 'UTC'
  FROM (VALUES (2), (3), (4), (5), (6)) AS d(dow)
  WHERE NOT EXISTS (SELECT 1 FROM availability_rules WHERE user_id = sys_id);
END $$;
