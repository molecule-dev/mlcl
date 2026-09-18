-- Broken-access-control fix: add a `role` column to users so the shared
-- catalog/config writes (products, sources, product_variants, price_entries,
-- price_history) can be gated behind an 'admin' role via the requireAdmin
-- middleware. These tables have no per-user owner, so without an admin role
-- any authenticated user could create/deface/delete the catalog or scribble
-- arbitrary price data. Reads stay public/authenticated; only writes are gated.
-- Idempotent: re-runs safely on existing schemas.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role character varying(32) NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
