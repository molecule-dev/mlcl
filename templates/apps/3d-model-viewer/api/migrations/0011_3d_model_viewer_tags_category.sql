-- 3d-model-viewer: add `category` and `tags` columns to `models`. The
-- ModelEdit page exposes both fields in the metadata panel; without these
-- columns the values were lost on save.
--
-- Idempotent: ALTER TABLE ... ADD COLUMN IF NOT EXISTS, so re-running on a
-- migrated database is a no-op.
ALTER TABLE public.models
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS models_category_idx ON public.models USING btree (category);
CREATE INDEX IF NOT EXISTS models_tags_gin_idx ON public.models USING gin (tags);
