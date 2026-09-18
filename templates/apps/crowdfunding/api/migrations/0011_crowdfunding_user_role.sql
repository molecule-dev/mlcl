-- Editorial-curation authorization: add a `role` column to users so the
-- privileged "feature this campaign" action (POST /campaigns/:id/feature,
-- which promotes a campaign onto the homepage) can be gated behind an
-- 'admin' role. Featuring is a site-curation decision, NOT a creator
-- self-service toggle — without this column any authenticated user (or any
-- campaign owner) could feature their own campaign.
-- Idempotent: re-runs safely on existing schemas.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role character varying(32) NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
