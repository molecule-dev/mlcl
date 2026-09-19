-- App: meal-planner. Domain tables for the recipe box / weekly plan /
-- grocery list / pantry model.
--
-- Ownership model:
--   - recipes with user_id NULL are the seeded, shared starter catalog
--     (readable by every authenticated user, editable by no one);
--   - recipes with user_id set are private to that user;
--   - everything else (plan entries, grocery items, pantry items) is
--     strictly owner-scoped.
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

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    servings integer DEFAULT 2 NOT NULL,
    prep_minutes integer DEFAULT 0 NOT NULL,
    cook_minutes integer DEFAULT 0 NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    image_emoji text DEFAULT '🍲'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    item_name text NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT ''::text NOT NULL,
    position integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.recipe_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    position integer DEFAULT 0 NOT NULL,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- One row per planned meal. week_start is always the Monday of the week
-- (ISO), day is 0 (Monday) .. 6 (Sunday), meal_slot is one of
-- breakfast | lunch | dinner.
CREATE TABLE public.meal_plan_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start date NOT NULL,
    day integer DEFAULT 0 NOT NULL,
    meal_slot text NOT NULL,
    recipe_id uuid NOT NULL,
    servings integer DEFAULT 2 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- The "list" is identified by (user_id, week_start): one grocery list per
-- planned week. source distinguishes plan-generated rows from manual ones;
-- regenerate replaces plan rows and keeps manual ones.
CREATE TABLE public.grocery_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start date NOT NULL,
    name text NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    checked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.pantry_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meal_plan_entries
    ADD CONSTRAINT meal_plan_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pantry_items
    ADD CONSTRAINT pantry_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");
CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");
CREATE INDEX users_email_index ON public.users USING btree (email);
CREATE INDEX users_username_index ON public.users USING btree (username);
CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");
CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");
CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");
CREATE INDEX "payments_createdAt_index" ON public.payments USING btree ("createdAt");
CREATE INDEX "payments_platformKey_index" ON public.payments USING btree ("platformKey");
CREATE INDEX "payments_productId_index" ON public.payments USING btree ("productId");
CREATE INDEX "payments_transactionId_index" ON public.payments USING btree ("transactionId");
CREATE INDEX "payments_updatedAt_index" ON public.payments USING btree ("updatedAt");
CREATE INDEX "payments_userId_index" ON public.payments USING btree ("userId");
CREATE INDEX recipes_owner_idx ON public.recipes USING btree (user_id);
CREATE INDEX recipes_title_idx ON public.recipes USING btree (title);
CREATE INDEX recipes_shared_idx ON public.recipes USING btree (user_id) WHERE (user_id IS NULL);
CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients USING btree (recipe_id, position);
CREATE INDEX recipe_steps_recipe_idx ON public.recipe_steps USING btree (recipe_id, position);
CREATE INDEX meal_plan_user_week_idx ON public.meal_plan_entries USING btree (user_id, week_start);
CREATE INDEX meal_plan_recipe_idx ON public.meal_plan_entries USING btree (recipe_id);
CREATE INDEX grocery_items_user_week_idx ON public.grocery_items USING btree (user_id, week_start);
CREATE INDEX grocery_items_source_idx ON public.grocery_items USING btree (source);
CREATE INDEX pantry_items_user_idx ON public.pantry_items USING btree (user_id);
CREATE INDEX pantry_items_name_idx ON public.pantry_items USING btree (user_id, name);
