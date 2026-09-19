-- App: bill-split. Baseline domain schema.
--
-- Money is stored as INTEGER CENTS everywhere (`amount_cents`). Never
-- floats, never numeric dollars — the split engine and balance engine
-- only ever add/subtract integers so totals stay exact.
--
-- The app is single-owner-per-group: every row is scoped by the `user_id`
-- of the account that owns the address book. Group participants are
-- `members` rows (the owner's own entry has `is_self = true`), so demo
-- users and freshly signed-up e2e users get the full multi-person
-- experience without needing a second authenticated account.
--
-- The framework tables (users / usersSecrets / devices) are byte-stable
-- across the fleet — do not specialize them per app.

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

CREATE TABLE public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    is_self boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    member_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    payer_member_id uuid NOT NULL,
    amount_cents integer NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'other'::text,
    date timestamp with time zone DEFAULT now() NOT NULL,
    split_method text DEFAULT 'equal'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.expense_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    member_id uuid NOT NULL,
    amount_cents integer NOT NULL
);

CREATE TABLE public.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    from_member_id uuid NOT NULL,
    to_member_id uuid NOT NULL,
    amount_cents integer NOT NULL,
    method text DEFAULT 'cash'::text NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    kind text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.expense_shares
    ADD CONSTRAINT expense_shares_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_group_member_key UNIQUE (group_id, member_id);

ALTER TABLE ONLY public.expense_shares
    ADD CONSTRAINT expense_shares_expense_member_key UNIQUE (expense_id, member_id);

CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");
CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");
CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");
CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");
CREATE INDEX "users_email_index" ON public.users USING btree (email);
CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");
CREATE INDEX "users_username_index" ON public.users USING btree (username);

CREATE INDEX groups_user_id_idx ON public.groups USING btree (user_id);
CREATE INDEX members_user_id_idx ON public.members USING btree (user_id);
CREATE INDEX members_user_email_idx ON public.members USING btree (user_id, email);
CREATE INDEX memberships_group_id_idx ON public.memberships USING btree (group_id);
CREATE INDEX memberships_member_id_idx ON public.memberships USING btree (member_id);
CREATE INDEX expenses_group_id_idx ON public.expenses USING btree (group_id);
CREATE INDEX expenses_group_date_idx ON public.expenses USING btree (group_id, date);
CREATE INDEX expenses_payer_idx ON public.expenses USING btree (payer_member_id);
CREATE INDEX expense_shares_expense_id_idx ON public.expense_shares USING btree (expense_id);
CREATE INDEX expense_shares_member_id_idx ON public.expense_shares USING btree (member_id);
CREATE INDEX settlements_group_id_idx ON public.settlements USING btree (group_id);
CREATE INDEX settlements_from_member_idx ON public.settlements USING btree (from_member_id);
CREATE INDEX settlements_to_member_idx ON public.settlements USING btree (to_member_id);
CREATE INDEX activities_group_id_idx ON public.activities USING btree (group_id);
CREATE INDEX activities_created_at_idx ON public.activities USING btree (created_at);

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_payer_member_id_fkey FOREIGN KEY (payer_member_id) REFERENCES public.members(id);

ALTER TABLE ONLY public.expense_shares
    ADD CONSTRAINT expense_shares_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expense_shares
    ADD CONSTRAINT expense_shares_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id);

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_from_member_id_fkey FOREIGN KEY (from_member_id) REFERENCES public.members(id);

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_to_member_id_fkey FOREIGN KEY (to_member_id) REFERENCES public.members(id);

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;
