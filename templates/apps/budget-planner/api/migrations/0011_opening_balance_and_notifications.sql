-- Squash followup: add opening_balance to budget_accounts so transaction
-- recomputes don't blow away the user's hand-entered starting balance,
-- and a notifications table so we have a place to persist
-- read/dismiss state per-user across reloads.

ALTER TABLE public.budget_accounts
    ADD COLUMN IF NOT EXISTS opening_balance numeric(20,4) DEFAULT 0 NOT NULL;

-- Backfill: for any rows that already exist with non-zero balance and zero
-- opening_balance (legacy data from before this column existed), assume the
-- recorded balance IS the opening balance.
UPDATE public.budget_accounts
   SET opening_balance = balance
 WHERE opening_balance = 0
   AND balance <> 0;

-- Notifications table — one row per user-visible notification, kept in
-- the DB so read state persists across reloads.
CREATE TABLE IF NOT EXISTS public.budget_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    href text,
    unread boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);

ALTER TABLE public.budget_notifications
    DROP CONSTRAINT IF EXISTS budget_notifications_pkey;
ALTER TABLE public.budget_notifications
    ADD CONSTRAINT budget_notifications_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS budget_notifications_user_unread_idx
    ON public.budget_notifications USING btree (user_id, unread, created_at DESC);
