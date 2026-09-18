-- Settings tables for accounting-invoicing flagship.
--
-- Three small per-user tables back the Settings page. They are intentionally
-- separate from accounts/customers/invoices because they are not part of the
-- accounting model — they are profile/integration/team metadata for the
-- workspace owner.

CREATE TABLE public.company_profile (
    user_id uuid PRIMARY KEY,
    legal_name text DEFAULT '' NOT NULL,
    billing_email text DEFAULT '' NOT NULL,
    tax_id text DEFAULT '' NOT NULL,
    address text DEFAULT '' NOT NULL,
    default_tax_rate_pct numeric(8,4) DEFAULT 0 NOT NULL,
    filing_method text DEFAULT 'cash' NOT NULL,
    fiscal_year_start text DEFAULT 'January' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'not_connected' NOT NULL,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX integrations_user_id_idx ON public.integrations USING btree (user_id);

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'member' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX team_members_user_id_idx ON public.team_members USING btree (user_id);
