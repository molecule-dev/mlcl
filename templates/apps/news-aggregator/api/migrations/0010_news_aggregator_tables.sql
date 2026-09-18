-- news-aggregator: app-specific tables. The base scaffold ships migrations
-- for users / devices / payments only; everything below is referenced from
-- api/handlers/*.ts and must exist before the api boots.
--
-- INVENTORY entities covered: sources, articles, news_categories,
-- user_interests, story_coverage, source_followers. (bookmarks / users etc.
-- live in their respective resource scaffolds.)

CREATE TABLE IF NOT EXISTS news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'newspaper',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  -- `tint` keys the Topic chip palette in the frontend (matches the
  -- `Topic.tint` union: tech | business | science | sports | …).
  tint TEXT NOT NULL DEFAULT 'world',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS news_categories_slug_idx ON news_categories (slug);
CREATE INDEX IF NOT EXISTS news_categories_sort_order_idx ON news_categories (sort_order);

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  feed_url TEXT NOT NULL,
  website_url TEXT,
  category_id UUID REFERENCES news_categories(id) ON DELETE SET NULL,
  icon_url TEXT,
  -- bias_value: -1.0 (left) … 0 (centre) … 1.0 (right)
  bias_value NUMERIC(4, 3) DEFAULT 0,
  -- factual_rating: 0..100
  factual_rating INTEGER DEFAULT 80,
  ownership TEXT,
  accent_color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  article_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sources_user_id_idx ON sources (user_id);
CREATE INDEX IF NOT EXISTS sources_category_id_idx ON sources (category_id);
CREATE INDEX IF NOT EXISTS sources_is_active_idx ON sources (is_active);
CREATE INDEX IF NOT EXISTS sources_slug_idx ON sources (slug);

-- Articles in news-aggregator are "stories" — a clustered headline that
-- aggregates coverage across multiple sources. A separate `story_coverage`
-- table holds the per-source framings that surface on the story-detail page.
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  category_id UUID REFERENCES news_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '#',
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  summary TEXT,
  -- Average bias across all source framings. -1 (left) → +1 (right).
  bias_score NUMERIC(4, 3) DEFAULT 0,
  -- Number of distinct sources covering this story.
  source_count INTEGER NOT NULL DEFAULT 1,
  sentiment TEXT,
  read_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS articles_source_id_idx ON articles (source_id);
CREATE INDEX IF NOT EXISTS articles_category_id_idx ON articles (category_id);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles (published_at);

-- Per-source coverage variations of a single story. The frontend renders
-- these on /stories/:id under "How each outlet framed it".
CREATE TABLE IF NOT EXISTS story_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  excerpt TEXT,
  url TEXT NOT NULL DEFAULT '#',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS story_coverage_article_id_idx ON story_coverage (article_id);
CREATE INDEX IF NOT EXISTS story_coverage_source_id_idx ON story_coverage (source_id);

-- User-scoped follow lists. user_interests doubles as the topic-follow list
-- (since topics map 1:1 to categories in this app). source_followers is
-- separate so we don't conflate per-source follows with category interests.
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID REFERENCES news_categories(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ,
  UNIQUE (user_id, category_id)
);
CREATE INDEX IF NOT EXISTS user_interests_user_id_idx ON user_interests (user_id);
CREATE INDEX IF NOT EXISTS user_interests_category_id_idx ON user_interests (category_id);

CREATE TABLE IF NOT EXISTS source_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_id)
);
CREATE INDEX IF NOT EXISTS source_followers_user_id_idx ON source_followers (user_id);
CREATE INDEX IF NOT EXISTS source_followers_source_id_idx ON source_followers (source_id);

-- Bookmarks: we use the canonical generic table from
-- `@molecule/api-resource-bookmark` (camelCase: userId / resourceType
-- ('article') / resourceId / createdAt / updatedAt). It is created by the
-- 1777471799220_create_bookmarks_table.sql migration that the base
-- scaffold ships. Our handler maps article_id ↔ resourceId.
