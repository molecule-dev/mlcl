-- watch_history upsert race: POST /library/history upserts via
-- check-then-insert, and a page-load ping can race itself (React dev
-- StrictMode fires the mount effect twice) into inserting TWO rows for the
-- same (user_id, video_id). The Library page then renders both cards keyed by
-- the same video id — a duplicate-React-key console error that fails the
-- e2e console gate. Dedupe to the latest row per (user, video), then enforce
-- uniqueness so the handler's create can never double-insert again (its
-- create-failure path updates the winner's row instead).

DELETE FROM public.watch_history a
  USING public.watch_history b
  WHERE a.user_id = b.user_id
    AND a.video_id = b.video_id
    AND (a.watched_at < b.watched_at
      OR (a.watched_at = b.watched_at AND a.id < b.id));

CREATE UNIQUE INDEX IF NOT EXISTS watch_history_user_video_uidx
  ON public.watch_history USING btree (user_id, video_id);
