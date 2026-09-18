-- Per-user notifications table — comments, mentions, shares, suggestions
-- and system messages. Maps 1:1 to the QuillonActivityRow surface in the
-- frontend so the activity feed and notification list can render the same
-- payload shape without a decorator step.
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(64) NOT NULL,
    actor character varying(255) NOT NULL DEFAULT '',
    description text NOT NULL DEFAULT '',
    href text,
    unread boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS notifications_user_recent_index
    ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_index
    ON public.notifications USING btree (user_id, unread)
    WHERE (unread = true);

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
