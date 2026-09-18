-- Category-taxonomy authorization: add a `role` column to users so the
-- /categories writes (creating, renaming, re-slugging, deleting the global
-- job_categories taxonomy that every job and applicant shares) can be gated
-- behind an 'admin' role, while regular users keep ownership-only edit/delete
-- of their own jobs, applications, profile, and saved jobs. Without this, any
-- authenticated user could mutate or delete categories the whole board uses.
-- Idempotent: re-runs safely on existing schemas.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role character varying(32) NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
