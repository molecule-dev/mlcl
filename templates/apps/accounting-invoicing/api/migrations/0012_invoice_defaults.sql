-- Invoice-default preferences for accounting-invoicing.
--
-- The Settings page's "Invoice defaults" section (and the new-invoice right
-- rail, which edits the same defaults in place) needs per-company preferences
-- beyond the tax fields 0010 already carried. All columns are NOT NULL with
-- defaults so existing rows upgrade in place.

ALTER TABLE public.company_profile
    ADD COLUMN currency text DEFAULT 'USD' NOT NULL,
    ADD COLUMN payment_terms text DEFAULT 'net_30' NOT NULL,
    ADD COLUMN invoice_late_fee_enabled boolean DEFAULT false NOT NULL,
    ADD COLUMN invoice_recurring_enabled boolean DEFAULT false NOT NULL;
