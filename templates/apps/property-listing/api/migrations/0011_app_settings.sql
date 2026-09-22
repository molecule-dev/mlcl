-- Per-user application settings for property-listing (profile phone/bio +
-- notification preferences).
--
-- The platform User resource never returns `oauthData` on reads and drops it
-- on writes, so the app-facing profile slice needs its own server-side
-- channel: GET/PATCH /api/settings read/merge this table (see
-- api/src/handlers/settings.ts). One row per user; the JSONB `data` column
-- carries the open-ended slice so new preference keys need no migration.

CREATE TABLE IF NOT EXISTS public.app_settings (
    "userId" uuid NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS app_settings_user_id_key ON public.app_settings ("userId");
