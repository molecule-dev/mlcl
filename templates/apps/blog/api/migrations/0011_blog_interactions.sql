-- Track post views for analytics + add timestamps to reactions for ordering.
-- Idempotent: re-runs safely on existing schemas.

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views bigint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS posts_views_idx ON public.posts (views DESC);

-- A simple unique reaction per (user, resource, type) is already
-- enforced by the reactions_resourceType_resourceId_userId_type_key
-- constraint; we don't need a new index. Same for bookmarks.

-- Optional analytics rollup view for top posts.
CREATE OR REPLACE VIEW public.post_view_stats AS
SELECT
  p.id,
  p.title,
  p.slug,
  p.author_id,
  p.published_at,
  p.views,
  COALESCE(r.clap_count, 0) AS claps,
  COALESCE(c.comment_count, 0) AS comment_count
FROM public.posts p
LEFT JOIN (
  SELECT "resourceId", COUNT(*)::bigint AS clap_count
  FROM public.reactions
  WHERE "resourceType" = 'post'
  GROUP BY "resourceId"
) r ON r."resourceId" = p.id::text
LEFT JOIN (
  SELECT "resourceId", COUNT(*)::bigint AS comment_count
  FROM public.comments
  WHERE "resourceType" = 'post'
  GROUP BY "resourceId"
) c ON c."resourceId" = p.id::text;
