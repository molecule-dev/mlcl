-- Emergency contact per signed-in user (design: Profile → Emergency
-- Contact card). One row per user; the API upserts on save.
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_name text DEFAULT ''::text NOT NULL,
    contact_phone text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS emergency_contacts_user_id_key
    ON public.emergency_contacts (user_id);
