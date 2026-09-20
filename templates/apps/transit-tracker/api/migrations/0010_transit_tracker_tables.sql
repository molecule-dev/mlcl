-- App: transit-tracker. Baseline schema, replayed as a single transaction
-- at first boot by the runtime migration runner.
--
-- Framework tables (users, usersSecrets, devices) are shared fleet-wide;
-- everything below `transit_lines` is the transit-tracker domain.
--
-- DATA MODEL SHAPE (mock GTFS): the network is a fictional mid-size city
-- ("Averton") seeded from api/fixtures/network.json. GTFS names the concepts
-- routes/stops/stop_times/calendar; we keep the transit vocabulary but
-- simplify to what a tracker needs:
--   transit_lines           ~ GTFS routes.txt   (one row per line)
--   transit_stops           ~ GTFS stops.txt    (one row per stop)
--   transit_stop_positions  ~ GTFS stop_times   (ordered stop list per line,
--                            direction 0 only — direction 1 is the REVERSE
--                            order with the same travel times, derived in
--                            api/src/lib/network.ts, not stored twice)
--   transit_schedules       ~ GTFS calendar +  frequencies (headway-based:
--                            service = first_departure → last_departure
--                            every headway_seconds, per line AND direction)
-- Live arrivals are NOT stored — they are deterministically simulated from
-- these schedules + the request clock (api/src/lib/arrivals.ts). No vehicle
-- positions, no randomness, no websocket feed.
--
-- saved_stops is the only user-written domain table (a stop "favorite").
-- transit_alerts are agency-side service alerts; line_code NULL = system-wide.

CREATE TABLE public.users (
    id uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    username character varying(255),
    name text,
    email character varying(1023),
    "emailVerified" boolean,
    "twoFactorEnabled" boolean DEFAULT false,
    "oauthServer" text,
    "oauthId" text,
    "oauthData" jsonb,
    "planKey" text,
    "planExpiresAt" timestamp with time zone,
    "planAutoRenews" boolean DEFAULT false
);


CREATE TABLE public."usersSecrets" (
    id uuid NOT NULL,
    "passwordHash" text,
    "passwordResetToken" text,
    "passwordResetTokenAt" timestamp with time zone,
    "pendingTwoFactorSecret" text,
    "twoFactorSecret" text
);


CREATE TABLE public.devices (
    id uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid NOT NULL,
    name text,
    "pushPlatform" text,
    "pushSubscription" jsonb,
    "hasPushSubscription" boolean
);


CREATE TABLE public.transit_lines (
    code text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    color text NOT NULL,
    polyline jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transit_lines_pkey PRIMARY KEY (code),
    CONSTRAINT transit_lines_kind_check CHECK (kind IN ('metro', 'bus', 'tram'))
);


CREATE TABLE public.transit_stops (
    code text NOT NULL,
    name text NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    hub boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transit_stops_pkey PRIMARY KEY (code)
);


CREATE TABLE public.transit_stop_positions (
    line_code text NOT NULL,
    stop_code text NOT NULL,
    sequence integer NOT NULL,
    travel_seconds_from_prev integer DEFAULT 0 NOT NULL,
    CONSTRAINT transit_stop_positions_pkey PRIMARY KEY (line_code, stop_code),
    CONSTRAINT transit_stop_positions_line_code_fkey FOREIGN KEY (line_code) REFERENCES public.transit_lines (code) ON DELETE CASCADE,
    CONSTRAINT transit_stop_positions_stop_code_fkey FOREIGN KEY (stop_code) REFERENCES public.transit_stops (code) ON DELETE CASCADE
);

CREATE INDEX transit_stop_positions_line_seq_idx ON public.transit_stop_positions USING btree (line_code, sequence);


CREATE TABLE public.transit_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    line_code text NOT NULL,
    direction integer NOT NULL,
    first_departure text NOT NULL,
    last_departure text NOT NULL,
    headway_seconds integer NOT NULL,
    CONSTRAINT transit_schedules_pkey PRIMARY KEY (id),
    CONSTRAINT transit_schedules_line_direction_key UNIQUE (line_code, direction),
    CONSTRAINT transit_schedules_line_code_fkey FOREIGN KEY (line_code) REFERENCES public.transit_lines (code) ON DELETE CASCADE,
    CONSTRAINT transit_schedules_direction_check CHECK (direction IN (0, 1))
);


CREATE TABLE public.transit_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    line_code text,
    severity text DEFAULT 'info'::text NOT NULL,
    title text NOT NULL,
    body text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transit_alerts_pkey PRIMARY KEY (id),
    CONSTRAINT transit_alerts_line_code_fkey FOREIGN KEY (line_code) REFERENCES public.transit_lines (code) ON DELETE CASCADE,
    CONSTRAINT transit_alerts_severity_check CHECK (severity IN ('info', 'warning', 'severe'))
);

CREATE INDEX transit_alerts_line_code_idx ON public.transit_alerts USING btree (line_code);
CREATE INDEX transit_alerts_starts_at_idx ON public.transit_alerts USING btree (starts_at);


CREATE TABLE public.saved_stops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stop_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT saved_stops_pkey PRIMARY KEY (id),
    CONSTRAINT saved_stops_user_stop_key UNIQUE (user_id, stop_code),
    CONSTRAINT saved_stops_stop_code_fkey FOREIGN KEY (stop_code) REFERENCES public.transit_stops (code) ON DELETE CASCADE
);

CREATE INDEX saved_stops_user_id_idx ON public.saved_stops USING btree (user_id);


CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");
CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");
CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");
CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");
CREATE INDEX users_email_index ON public.users USING btree (email);
CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");
CREATE INDEX users_username_index ON public.users USING btree (username);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
