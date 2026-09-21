-- App: transit-tracker. User notification-center rows.
--
-- The settings page stores the user's notification CHANNEL toggles inside
-- users."oauthData".preferences (see api/src/handlers/preferences.ts);
-- these rows are the delivered notifications themselves — GET /api/notifications
-- serves them, PUT /:id/read and DELETE /:id manage them. Shape mirrors the
-- fleet-wide notifications table (e.g. flight-search 0010) so the shared
-- notification-center UI components work unchanged.

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    title text NOT NULL,
    body text,
    icon text,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at);
CREATE INDEX notifications_read_idx ON public.notifications USING btree (read);
CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);
