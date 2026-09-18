-- Add the operator role column the carrier admin-gate depends on.
--
-- Background: finding P2H-3 gated the global carrier catalog writes
-- (create/update/delete) behind `requireAdmin`, which authorizes a caller by
-- `users.role === 'admin'` (or the ADMIN_EMAILS allow-list, with lazy
-- promotion that writes `role = 'admin'`). But the original 0010 schema never
-- added a `role` column to `users`, so both the role check and the lazy-
-- promotion write referenced a column that did not exist — the gate could
-- never admit anyone and the promotion write was a silent no-op.
--
-- This adds the column (default 'user') so the documented authorization model
-- actually functions: operators carry role='admin' and can manage carriers,
-- while every other authenticated user keeps role='user' and is correctly
-- refused (P2H-3 preserved).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' NOT NULL;
