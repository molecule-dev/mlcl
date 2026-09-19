-- App: daily-puzzle. Baseline schema, replayed as a single transaction at
-- first boot by the runtime migration runner.
--
-- Framework tables (users, usersSecrets, devices, payments) are shared
-- fleet-wide; everything below `words` is the daily-puzzle domain.
--
-- user_stats DESIGN CHOICE (spec: "user_stats … or computed from results —
-- choose + document"): we MAINTAIN a user_stats row transactionally when a
-- daily (non-practice) game finishes, instead of aggregating results on every
-- /api/stats/me read. Rationale: stats are read on every Play/Stats page load
-- (hot path) but written exactly once per finished game (cold path), and the
-- streak computation needs yesterday's outcome — a fold over results each
-- read would re-derive history per request. results stays the source of
-- truth; user_stats is a derived, rebuildable projection of it.
--
-- Puzzle lifecycle: one puzzle per UTC calendar day, created LAZILY on first
-- play (deterministic date-hash word pick — no cron). Past-day plays are
-- marked practice=true and never touch user_stats.

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
    "twoFactorSecret" text,
    "lastTwoFactorTimeStep" integer
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


CREATE TABLE public.payments (
    id uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" uuid NOT NULL,
    "transactionId" text,
    "productId" text,
    "platformKey" text,
    data jsonb,
    receipt text
);


--
-- Domain: dictionary. `common` words are eligible answers; every row is a
-- valid guess. Seeded from api/fixtures/words.json by handlers/_seed.ts.
--

CREATE TABLE public.words (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    word text NOT NULL,
    common boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Domain: puzzles. `date` is a UTC 'YYYY-MM-DD' TEXT key (not a date column)
-- so the one-puzzle-per-calendar-day identity is TZ-unambiguous. Created
-- lazily; the word is picked deterministically from the word hash so every
-- concurrent first-player races to the SAME row (UNIQUE below absorbs it).
--

CREATE TABLE public.puzzles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date text NOT NULL,
    word text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Domain: guesses. feedback is a JSONB array of per-letter states
-- ('correct' | 'present' | 'absent'), stored at submit time so replays and
-- share cards never re-derive it.
--

CREATE TABLE public.guesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    puzzle_id uuid NOT NULL,
    user_id uuid NOT NULL,
    guess_number integer NOT NULL,
    word text NOT NULL,
    feedback jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Domain: results. One row per (puzzle, user) once the game is over —
-- solved on the answer word, or lost after the 6th wrong guess. practice
-- marks archive (past-day) plays: they never affect user_stats.
--

CREATE TABLE public.results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    puzzle_id uuid NOT NULL,
    user_id uuid NOT NULL,
    solved boolean DEFAULT false NOT NULL,
    attempts integer NOT NULL,
    practice boolean DEFAULT false NOT NULL,
    finished_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Domain: user_stats — maintained projection of non-practice results
-- (see the design note in this file's header). distribution is a JSONB
-- object { "1": n, …, "6": n } counting wins by attempt count; losses are
-- not binned.
--

CREATE TABLE public.user_stats (
    user_id uuid NOT NULL,
    played integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    current_streak integer DEFAULT 0 NOT NULL,
    max_streak integer DEFAULT 0 NOT NULL,
    distribution jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Primary keys
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.words
    ADD CONSTRAINT words_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.puzzles
    ADD CONSTRAINT puzzles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guesses
    ADD CONSTRAINT guesses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (user_id);


--
-- Uniques
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.words
    ADD CONSTRAINT words_word_key UNIQUE (word);

-- One puzzle per calendar day — the lazy get-or-create races to the same
-- deterministic word, so the conflicting insert is simply dropped.
ALTER TABLE ONLY public.puzzles
    ADD CONSTRAINT puzzles_date_key UNIQUE (date);

-- One result row per player per puzzle (guess dedup follows the same shape).
ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_puzzle_user_key UNIQUE (puzzle_id, user_id);

ALTER TABLE ONLY public.guesses
    ADD CONSTRAINT guesses_puzzle_user_number_key UNIQUE (puzzle_id, user_id, guess_number);


--
-- Indexes
--

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");
CREATE INDEX "users_email_index" ON public.users USING btree (email);
CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");
CREATE INDEX "users_username_index" ON public.users USING btree (username);

CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");
CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");
CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");

CREATE INDEX "payments_createdAt_index" ON public.payments USING btree ("createdAt");
CREATE INDEX "payments_updatedAt_index" ON public.payments USING btree ("updatedAt");
CREATE INDEX "payments_userId_index" ON public.payments USING btree ("userId");
CREATE INDEX "payments_transactionId_index" ON public.payments USING btree ("transactionId");
CREATE INDEX "payments_productId_index" ON public.payments USING btree ("productId");
CREATE INDEX "payments_platformKey_index" ON public.payments USING btree ("platformKey");

CREATE INDEX words_word_idx ON public.words USING btree (word);

CREATE INDEX puzzles_date_idx ON public.puzzles USING btree (date);

CREATE INDEX guesses_puzzle_user_idx ON public.guesses USING btree (puzzle_id, user_id);
CREATE INDEX guesses_user_id_idx ON public.guesses USING btree (user_id);

CREATE INDEX results_puzzle_id_idx ON public.results USING btree (puzzle_id);
CREATE INDEX results_user_id_idx ON public.results USING btree (user_id);
CREATE INDEX results_practice_idx ON public.results USING btree (practice);
-- Leaderboard's per-day distribution groups results by puzzle + attempts.
CREATE INDEX results_puzzle_attempts_idx ON public.results USING btree (puzzle_id, attempts);

CREATE INDEX user_stats_max_streak_idx ON public.user_stats USING btree (max_streak DESC);
CREATE INDEX user_stats_current_streak_idx ON public.user_stats USING btree (current_streak DESC);


--
-- Foreign keys
--

ALTER TABLE ONLY public.guesses
    ADD CONSTRAINT guesses_puzzle_id_fkey FOREIGN KEY (puzzle_id) REFERENCES public.puzzles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_puzzle_id_fkey FOREIGN KEY (puzzle_id) REFERENCES public.puzzles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
