-- Comment moderation: add a status column ('pending' | 'approved' | 'spam')
-- so the moderation UI on /comments can flip a comment's state.
-- Idempotent: re-runs safely on existing schemas.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS status character varying(16) NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS comments_status_idx ON public.comments (status);
