-- course-marketplace: notifications table for the in-app activity feed.
--
-- Owner-scoped (`user_id`) — every read/write is filtered by the calling
-- session's userId. `unread` flips to false on PUT /:id/read or
-- POST /api/notifications/read-all.
--
-- The `entity_id` column points at whatever the notification is about
-- (a course id, an enrollment id, a review id, a certificate id, etc.)
-- and `href` is the in-app URL the notification card links to. Both
-- are nullable so a notification can be a pure system message.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  entity_id UUID,
  unread BOOLEAN NOT NULL DEFAULT TRUE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, unread) WHERE unread = TRUE;
