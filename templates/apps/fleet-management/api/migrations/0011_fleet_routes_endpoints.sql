-- fleet_routes + trips: store human-readable origin / destination labels
-- so the routes list and trip log can render them next to the row.
-- maintenance_records: store parts/labor/events JSON so the work-order
-- detail page can render the full breakdown the design specifies.
--
-- Idempotent so re-running the migration on an existing DB is safe.

ALTER TABLE public.fleet_routes
    ADD COLUMN IF NOT EXISTS origin text,
    ADD COLUMN IF NOT EXISTS destination text;

ALTER TABLE public.trips
    ADD COLUMN IF NOT EXISTS start_location text,
    ADD COLUMN IF NOT EXISTS end_location text;

ALTER TABLE public.maintenance_records
    ADD COLUMN IF NOT EXISTS details_json jsonb DEFAULT '{}'::jsonb;
