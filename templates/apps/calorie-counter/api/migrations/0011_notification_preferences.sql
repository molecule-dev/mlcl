--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    meals boolean DEFAULT true NOT NULL,
    water boolean DEFAULT true NOT NULL,
    streak boolean DEFAULT false NOT NULL,
    weekly boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'notification_preferences_pkey'
          AND table_name = 'notification_preferences'
    ) THEN
        ALTER TABLE ONLY public.notification_preferences
            ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_id_uidx
    ON public.notification_preferences USING btree (user_id);
