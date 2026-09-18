--
-- Add user-editable size_label and shared_with columns to documents.
--
-- The Documents UI lets a user enter a size label ("e.g. 240 KB") and a
-- "Shared with" audience ("All employees", "Engineering", etc.) when they
-- attach a file by URL. We persist these alongside the file metadata so
-- the values the user typed round-trip through the API instead of being
-- silently overwritten by computed defaults.
--

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS size_label text,
    ADD COLUMN IF NOT EXISTS shared_with text;
