-- Broken-access-control fix: the global `categories` catalog had no per-user
-- owner, so any authenticated user could create/update/delete categories.
-- The requireAdmin middleware gates those writes on an admin role; this adds
-- the durable `role` column it reads (and lazily promotes ADMIN_EMAILS into).
-- Idempotent ALTER so it applies to fresh + already-provisioned users tables.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user';
