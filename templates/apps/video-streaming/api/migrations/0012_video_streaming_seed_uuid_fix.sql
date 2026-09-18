-- Fix migration 0011 retroactively for any database that already applied
-- the previous (non-RFC-4122) seed ids. The previous seed used ids like
-- `00000000-0000-0000-0002-000000000001` which look like UUIDs but fail
-- Zod's `.uuid()` validator in handlers/videos.ts → every Watch click 400'd.
--
-- This migration deletes the original seed rows (referenced cleanly by id
-- prefix) and re-inserts the v4-shaped equivalents from migration 0011.
-- Idempotent: if 0011's new ids are already present, the DELETE finds
-- nothing to remove and the INSERT statements are no-ops via
-- ON CONFLICT DO NOTHING in 0011 (which the migration runner re-applies).

-- Wipe any leftover videos from the broken seed.
DELETE FROM public.videos WHERE id::text LIKE '00000000-0000-0000-0002-%';
DELETE FROM public.channels WHERE id::text LIKE '00000000-0000-0000-0001-%';
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';
