-- Uploads registry for user-uploaded listing photos.
--
-- Each row OWNS one object stored in the uploads bond (S3 by default): `file_id`
-- is the provider's object key and `user_id` is the uploader. Listing photos are
-- stored PRIVATELY (S3 buckets are private by default) and streamed back through
-- GET /api/uploads/:id — the uploads bond exposes no presigned-URL method, so the
-- browser both uploads through the API (POST /api/uploads) and reads through it.
-- The public serve route only hands back an id present in THIS table, so a raw
-- bucket key can never be fetched through the API. See api/src/handlers/uploads.ts.
--
-- Fully idempotent (IF NOT EXISTS): the migration runner replays every *.sql on
-- each boot in lexical order.
CREATE TABLE IF NOT EXISTS public.uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    file_id text NOT NULL,
    filename text,
    mimetype text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS uploads_user_id_idx ON public.uploads USING btree (user_id);
CREATE INDEX IF NOT EXISTS uploads_file_id_idx ON public.uploads USING btree (file_id);
