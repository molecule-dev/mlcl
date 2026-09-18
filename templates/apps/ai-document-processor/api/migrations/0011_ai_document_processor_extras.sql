-- AI Document Processor — extras for AI metadata + API token UX.
-- Adds columns the frontend pages (Documents, DocumentDetail, Settings)
-- expect on top of the squashed 0010 baseline:
--   * documents.classification_confidence/reasoning/suggested_filing_path/original_name
--     come from the AI extraction tool_use payload (see handlers/upload.ts).
--   * document_fields.field_group is a UI grouping bucket (Vendor / Totals / etc).
--   * api_tokens.prefix is a non-secret 12-char prefix used to display
--     "adp_xxxxxxxx…" in the Settings page after the plaintext token has
--     been forgotten.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS classification_confidence numeric(5,4),
  ADD COLUMN IF NOT EXISTS classification_reasoning text,
  ADD COLUMN IF NOT EXISTS suggested_filing_path text,
  ADD COLUMN IF NOT EXISTS original_name text;

ALTER TABLE public.document_fields
  ADD COLUMN IF NOT EXISTS field_group text;

ALTER TABLE public.api_tokens
  ADD COLUMN IF NOT EXISTS prefix text;
