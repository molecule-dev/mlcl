-- music-daw: extend music_projects and samples to surface fields the
-- frontend pages need (cover_index for tile artwork, is_pinned for the
-- "Last session" hero card on the dashboard, pack/category/cover_index/
-- is_loop for the sample library cards). All columns default to safe
-- values so existing rows continue to work.

ALTER TABLE music_projects
  ADD COLUMN IF NOT EXISTS cover_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE samples
  ADD COLUMN IF NOT EXISTS pack TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS cover_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_loop BOOLEAN NOT NULL DEFAULT FALSE;
