-- App: feedback-roadmap. Domain tables for the Canny-like feedback board:
-- boards, posts (status workflow + merge), upvotes, and comments.
--
-- Framework tables (users / usersSecrets / devices) are included so a
-- single replayable migration boots the whole app on an empty database;
-- the payments table arrives separately in 0020 (billing).
--
-- Status lifecycle on feedback_posts:
--   open -> planned -> in_progress -> shipped   (shipped_at set on ship,
--                                               becomes a changelog entry)
--   open -> declined                             (closed with a reason)
--   any -> merged (merged_into_id points at the surviving post; votes and
--                  comments move to the target at merge time)

CREATE TABLE public.users (
    id uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    username character varying(255),
    name text,
    email character varying(1023),
    "twoFactorEnabled" boolean DEFAULT false,
    "oauthServer" text,
    "oauthId" text,
    "oauthData" jsonb,
    "planKey" text,
    "planExpiresAt" timestamp with time zone,
    "planAutoRenews" boolean DEFAULT false,
    role text DEFAULT 'member'::text NOT NULL,
    bio text,
    avatar_url text
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

CREATE TABLE public.feedback_boards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    color text,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.feedback_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text,
    title text NOT NULL,
    body text NOT NULL,
    board_id uuid NOT NULL,
    author_id uuid NOT NULL,
    user_id uuid GENERATED ALWAYS AS (author_id) STORED,
    status text DEFAULT 'open'::text NOT NULL,
    admin_response text,
    admin_responded_at timestamp with time zone,
    merged_into_id uuid,
    vote_count integer DEFAULT 0 NOT NULL,
    comment_count integer DEFAULT 0 NOT NULL,
    roadmap_label text,
    shipped_at timestamp with time zone,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.feedback_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.feedback_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    user_id uuid GENERATED ALWAYS AS (author_id) STORED,
    body text NOT NULL,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- --- constraints ---

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback_boards
    ADD CONSTRAINT feedback_boards_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback_posts
    ADD CONSTRAINT feedback_posts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback_comments
    ADD CONSTRAINT feedback_comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_post_id_user_id_key UNIQUE (post_id, user_id);

-- --- indexes ---

CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");
CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");
CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");
CREATE INDEX users_email_index ON public.users USING btree (email);
CREATE INDEX users_role_idx ON public.users USING btree (role);
CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");
CREATE INDEX users_username_index ON public.users USING btree (username);

CREATE UNIQUE INDEX feedback_boards_slug_idx ON public.feedback_boards USING btree (slug);
CREATE INDEX feedback_boards_sort_order_idx ON public.feedback_boards USING btree (sort_order);

CREATE INDEX feedback_posts_author_id_idx ON public.feedback_posts USING btree (author_id);
CREATE INDEX feedback_posts_board_id_created_idx
    ON public.feedback_posts USING btree (board_id, created_at DESC);
CREATE INDEX feedback_posts_board_id_vote_count_idx
    ON public.feedback_posts USING btree (board_id, vote_count DESC);
CREATE INDEX feedback_posts_merged_into_id_idx ON public.feedback_posts USING btree (merged_into_id);
CREATE INDEX feedback_posts_shipped_at_idx ON public.feedback_posts USING btree (shipped_at DESC);
CREATE INDEX feedback_posts_status_idx ON public.feedback_posts USING btree (status);
CREATE INDEX feedback_posts_user_id_idx ON public.feedback_posts USING btree (user_id);

CREATE INDEX feedback_votes_post_id_idx ON public.feedback_votes USING btree (post_id);
CREATE INDEX feedback_votes_user_id_idx ON public.feedback_votes USING btree (user_id);
CREATE INDEX feedback_votes_created_at_idx ON public.feedback_votes USING btree (created_at DESC);

CREATE INDEX feedback_comments_author_id_idx ON public.feedback_comments USING btree (author_id);
CREATE INDEX feedback_comments_post_id_idx ON public.feedback_comments USING btree (post_id);
CREATE INDEX feedback_comments_user_id_idx ON public.feedback_comments USING btree (user_id);

-- --- foreign keys ---

ALTER TABLE ONLY public.feedback_posts
    ADD CONSTRAINT feedback_posts_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.feedback_boards(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feedback_posts
    ADD CONSTRAINT feedback_posts_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.feedback_posts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feedback_posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feedback_comments
    ADD CONSTRAINT feedback_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feedback_posts(id) ON DELETE CASCADE;
