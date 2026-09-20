-- App: donor-management. Domain baseline for the nonprofit donor CRM.
--
-- Framework tables (users, usersSecrets, devices) follow the fleet-standard
-- scaffold shape; the payments table arrives in 0011 (billing). Domain
-- tables, money in integer cents everywhere:
--   donors                       — the address book (people + organizations)
--   campaigns                    — fundraising appeals with a goal
--   gifts                        — individual donations (method, fund, campaign)
--   receipts + receipt_items     — yearly tax receipts, one line per gift
--   notes                        — freeform donor notes
--
-- Derived, never stored: donor lifetime giving, first/last gift dates,
-- campaign raised-to-date, gift "receipted" (receipt_id IS NOT NULL).
CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    goal_cents integer DEFAULT 0 NOT NULL,
    starts_on date,
    ends_on date,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: donors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    is_organization boolean DEFAULT false NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: gifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    donor_id uuid NOT NULL,
    amount_cents integer NOT NULL,
    gift_date date NOT NULL,
    method text DEFAULT 'card'::text NOT NULL,
    fund text DEFAULT 'general'::text NOT NULL,
    campaign_id uuid,
    receipt_id uuid,
    note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    donor_id uuid NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_id uuid NOT NULL,
    gift_id uuid NOT NULL,
    amount_cents integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone
);


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    donor_id uuid NOT NULL,
    year integer NOT NULL,
    receipt_number text NOT NULL,
    total_cents integer DEFAULT 0 NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: usersSecrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."usersSecrets" (
    id uuid NOT NULL,
    "passwordHash" text,
    "passwordResetToken" text,
    "passwordResetTokenAt" timestamp with time zone,
    "pendingTwoFactorSecret" text,
    "twoFactorSecret" text
);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: donors donors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donors
    ADD CONSTRAINT donors_pkey PRIMARY KEY (id);


--
-- Name: gifts gifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gifts
    ADD CONSTRAINT gifts_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: receipt_items receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_owner_id_year_donor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_owner_id_year_donor_id_key UNIQUE (owner_id, year, donor_id);


--
-- Name: receipts receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: usersSecrets usersSecrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."usersSecrets"
    ADD CONSTRAINT "usersSecrets_pkey" PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: campaigns_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_owner_id_idx ON public.campaigns USING btree (owner_id);


--
-- Name: campaigns_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_status_idx ON public.campaigns USING btree (status);


--
-- Name: devices_createdAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devices_createdAt_index" ON public.devices USING btree ("createdAt");


--
-- Name: devices_updatedAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devices_updatedAt_index" ON public.devices USING btree ("updatedAt");


--
-- Name: devices_userId_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devices_userId_index" ON public.devices USING btree ("userId");


--
-- Name: donors_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donors_name_idx ON public.donors USING btree (name);


--
-- Name: donors_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donors_owner_id_idx ON public.donors USING btree (owner_id);


--
-- Name: gifts_campaign_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gifts_campaign_id_idx ON public.gifts USING btree (campaign_id);


--
-- Name: gifts_donor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gifts_donor_id_idx ON public.gifts USING btree (donor_id);


--
-- Name: gifts_gift_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gifts_gift_date_idx ON public.gifts USING btree (gift_date);


--
-- Name: gifts_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gifts_owner_id_idx ON public.gifts USING btree (owner_id);


--
-- Name: gifts_receipt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gifts_receipt_id_idx ON public.gifts USING btree (receipt_id);


--
-- Name: notes_donor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_donor_id_idx ON public.notes USING btree (donor_id);


--
-- Name: notes_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_owner_id_idx ON public.notes USING btree (owner_id);


--
-- Name: receipt_items_gift_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX receipt_items_gift_id_idx ON public.receipt_items USING btree (gift_id);


--
-- Name: receipt_items_receipt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX receipt_items_receipt_id_idx ON public.receipt_items USING btree (receipt_id);


--
-- Name: receipts_donor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX receipts_donor_id_idx ON public.receipts USING btree (donor_id);


--
-- Name: receipts_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX receipts_owner_id_idx ON public.receipts USING btree (owner_id);


--
-- Name: users_createdAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_createdAt_index" ON public.users USING btree ("createdAt");


--
-- Name: users_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_index ON public.users USING btree (email);


--
-- Name: users_updatedAt_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_updatedAt_index" ON public.users USING btree ("updatedAt");


--
-- Name: users_username_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_username_index ON public.users USING btree (username);


--
-- Name: gifts gifts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gifts
    ADD CONSTRAINT gifts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: gifts gifts_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gifts
    ADD CONSTRAINT gifts_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.donors(id) ON DELETE CASCADE;


--
-- Name: notes notes_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.donors(id) ON DELETE CASCADE;


--
-- Name: receipt_items receipt_items_gift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_gift_id_fkey FOREIGN KEY (gift_id) REFERENCES public.gifts(id) ON DELETE CASCADE;


--
-- Name: receipt_items receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE CASCADE;


--
-- Name: receipts receipts_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.donors(id) ON DELETE CASCADE;


--
