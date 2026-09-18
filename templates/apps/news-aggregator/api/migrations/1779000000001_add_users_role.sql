-- Adds the `role` column used by the requireAdmin authorization gate
-- (middleware/require-admin.ts). Runs after the base users table migration
-- (1777471799236_create_users_table.sql). Defaults to 'user' so existing
-- accounts are non-privileged; admins are designated via the ADMIN_EMAILS
-- allow-list (lazily promoted to 'admin') or by setting this column directly.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user';
