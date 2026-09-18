-- 3d-model-viewer: add an `avatar` column to `users`. The Settings page's
-- avatar section uploads a profile photo and persists a SERVE URL
-- (`/api/user/avatar/<fileId>`) here; "Remove" clears it. Without this column
-- the upload had nowhere to save and the photo wouldn't survive a reload.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, so re-running on a migrated database
-- is a no-op.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS avatar text;
