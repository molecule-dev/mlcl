-- Persist the "archive" action that the inbox UI exposes. Without these
-- columns archive was local React state only, so a page reload restored
-- everything to the inbox — a textbook write-only / state-doesn't-persist
-- placeholder. We add `archived_at` to both surfaces the inbox shows
-- (drafts and sent_emails) so the Inbox archive folder is a real,
-- cross-session, cross-device view.

ALTER TABLE public.email_drafts
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS email_drafts_user_archived_idx
  ON public.email_drafts USING btree (user_id, archived_at);

ALTER TABLE public.sent_emails
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS sent_emails_user_archived_idx
  ON public.sent_emails USING btree (user_id, archived_at);
