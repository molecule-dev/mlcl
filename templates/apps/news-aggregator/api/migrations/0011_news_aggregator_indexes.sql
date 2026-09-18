-- news-aggregator: composite indexes for hot-path queries.
--
-- INVENTORY queries we accelerate:
--   - articles list filtered by (source_id, published_at desc)
--   - articles list filtered by (category_id, published_at desc)
--   - personalized "for-you" join on (user_id, category_id) over user_interests
--   - per-source coverage lookup on (article_id) over story_coverage

CREATE INDEX IF NOT EXISTS articles_source_published_idx
  ON articles (source_id, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_category_published_idx
  ON articles (category_id, published_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_interests_user_category_uidx
  ON user_interests (user_id, category_id);

CREATE INDEX IF NOT EXISTS story_coverage_article_published_idx
  ON story_coverage (article_id, published_at DESC);
