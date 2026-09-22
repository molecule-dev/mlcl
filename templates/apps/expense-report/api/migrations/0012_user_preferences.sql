-- Per-user workspace preferences for expense-report (reimbursement payout
-- method + notification toggles). One row per user.
--
-- Why a dedicated table: the shared `users` row is owned by
-- @molecule/api-resource-user and its read shape NEVER returns `oauthData`,
-- so prefs written there by the Settings page could not be read back. This
-- table is the app's own server-side channel: GET/PATCH /api/preferences.
CREATE TABLE public.user_preferences (
    user_id uuid PRIMARY KEY,
    payout_method text NOT NULL DEFAULT 'ach',
    notify_submitted boolean NOT NULL DEFAULT true,
    notify_reviewed boolean NOT NULL DEFAULT true,
    notify_reimbursed boolean NOT NULL DEFAULT true,
    notify_policy boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
