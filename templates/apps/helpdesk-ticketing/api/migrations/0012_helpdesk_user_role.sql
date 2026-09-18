-- Operator authorization: add a `role` column to users so the global
-- helpdesk catalog/config surfaces (SLA policies, knowledge-base articles,
-- automation macros) can gate their write paths behind an 'admin' role.
-- These tables are shared operator content with no per-user owner column,
-- so without an explicit role check ANY authenticated user (including an
-- end customer who just opened a ticket) could create/edit/delete SLA
-- policies and operator KB/macro content. requireAdmin reads this column.
-- Idempotent: re-runs safely on existing schemas.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role character varying(32) NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
