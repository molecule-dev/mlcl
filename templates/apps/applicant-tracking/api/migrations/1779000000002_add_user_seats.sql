-- Add the per-user seat count used by the billing page.
-- GET /billing/plan has always read `users.seats`; before this migration the
-- column did not exist, so the read silently resolved to 1 for everyone and
-- POST /billing/seats had nothing to persist to.

ALTER TABLE public.users
    ADD COLUMN seats integer NOT NULL DEFAULT 1;
