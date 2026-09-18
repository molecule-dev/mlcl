-- 0011 — persist per-assertion run results so the Test Runner UI can show
-- the same pass/fail breakdown after a page reload that it shows the moment
-- the user clicks Run. Without this, `last_status` survives but the UI's
-- per-assertion check marks all snap back to "SKIPPED" the next time the
-- page is loaded, even though the test demonstrably passed seconds ago.
ALTER TABLE public.tests
    ADD COLUMN IF NOT EXISTS last_results jsonb;
