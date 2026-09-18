-- Moderation authorization: add a `role` column to users so the privileged
-- tutor-status transition (PATCH /tutors/:id/status — approve / suspend /
-- reset to pending) can be gated behind an 'admin' role. Approving or
-- un-suspending a tutor profile is an operator decision, NOT a tutor
-- self-service toggle — without this column the only auth layer is
-- verifyMiddleware, which proves identity but grants no moderation rights, so
-- a tutor could self-approve via the profile-update path.
-- Mirrors the crowdfunding/blog role-gated precedent.
-- Idempotent: re-runs safely on existing schemas.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role character varying(32) NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
