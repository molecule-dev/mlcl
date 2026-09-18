-- Comment moderation authorization: add a `role` column to users so the
-- /comments moderation dashboard can gate moderation actions (approving
-- others' comments, marking spam, deleting others' content) behind a
-- 'moderator'/'admin' role, while authors keep ownership-only edit/delete
-- of their own comments. Without this, any authenticated user could edit
-- or delete any comment.
-- Idempotent: re-runs safely on existing schemas.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role character varying(32) NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
