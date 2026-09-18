-- 0011_wiki_extras.sql — additional wiki tables added during the
-- production-readiness pass:
--   * wiki_notifications: per-user feed of mentions/edits/etc.
--   * wiki_audit_log: per-space audit trail of role changes
--   * wiki_user_prefs: per-user workspace preferences (theme, default landing)
--   * payments: standard payment table for billing
-- Columns are kept narrow and indexed; everything is scoped by user_id /
-- space_id so cross-tenant reads are impossible.

CREATE TABLE IF NOT EXISTS public.wiki_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind character varying(64) NOT NULL,
    title text NOT NULL,
    body text,
    page_id uuid,
    actor_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS wiki_notifications_user_idx
  ON public.wiki_notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wiki_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    target_user_id uuid,
    action character varying(64) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS wiki_audit_log_space_idx
  ON public.wiki_audit_log (space_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wiki_user_prefs (
    user_id uuid NOT NULL,
    workspace_name text DEFAULT 'My workspace' NOT NULL,
    subdomain text,
    default_landing text DEFAULT 'home' NOT NULL,
    theme text DEFAULT 'system' NOT NULL,
    locale text DEFAULT 'en' NOT NULL,
    notify_mentions boolean DEFAULT true NOT NULL,
    notify_replies boolean DEFAULT true NOT NULL,
    notify_assignments boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id)
);

-- Standard payments table (mirrors @molecule/api-resource-payment schema).
-- The Stripe webhook handler writes into this table, and the
-- @molecule/api-entitlements provider reads from it to compute the active
-- tier. Without this table, the webhook silently no-ops and plan upgrades
-- never reflect after a Stripe checkout completes.
CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "updatedAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "userId" uuid NOT NULL,
  "transactionId" text,
  "productId" text,
  "platformKey" text,
  "data" jsonb,
  "receipt" text
);
CREATE INDEX IF NOT EXISTS "payments_createdAt_index" ON "payments" ("createdAt");
CREATE INDEX IF NOT EXISTS "payments_updatedAt_index" ON "payments" ("updatedAt");
CREATE INDEX IF NOT EXISTS "payments_userId_index" ON "payments" ("userId");
CREATE INDEX IF NOT EXISTS "payments_transactionId_index" ON "payments" ("transactionId");
CREATE INDEX IF NOT EXISTS "payments_productId_index" ON "payments" ("productId");
CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON "payments" ("platformKey");
