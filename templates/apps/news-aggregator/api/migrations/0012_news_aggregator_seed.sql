-- news-aggregator: seed categories (topics), sources, stories, and per-source
-- coverage. Seeds are idempotent on slug / (article_id+source_id) so re-running
-- is safe.
--
-- The frontend treats each `news_categories` row as a "topic" — slug, icon,
-- tint and accent_color are surfaced directly on /home, /topics, /topics/:slug.

INSERT INTO news_categories (name, slug, icon, color, tint, sort_order) VALUES
  ('World',         'world',         'public',             '#0a7e8c', 'world',         10),
  ('Business',      'business',      'trending_up',        '#059669', 'business',      20),
  ('Tech',          'tech',          'memory',             '#3b82f6', 'tech',          30),
  ('Science',       'science',       'science',            '#8b5cf6', 'science',       40),
  ('Sports',        'sports',        'sports_basketball',  '#f59e0b', 'sports',        50),
  ('Culture',       'culture',       'theater_comedy',     '#e07428', 'culture',       60),
  ('Entertainment', 'entertainment', 'movie',              '#ec4899', 'entertainment', 70)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  tint = EXCLUDED.tint,
  sort_order = EXCLUDED.sort_order;

-- Sources are the "outlets" plotted on the bias spectrum. We seed canonical
-- well-known wires and dailies with realistic factual / bias values; the
-- sources page renders these directly. Marker `user_id IS NULL` = global.
INSERT INTO sources (
  name, slug, description, feed_url, website_url, category_id,
  bias_value, factual_rating, ownership, accent_color, is_active
)
SELECT
  s.name, s.slug, s.description, s.feed_url, s.website_url, c.id,
  s.bias_value, s.factual_rating, s.ownership, s.accent_color, true
FROM (VALUES
  ('Reuters',            'reuters',  'Global wire service. Centrist, fact-led.',
   'https://www.reutersagency.com/feed/?best-topics=tech&post_type=best',
   'https://www.reuters.com/',                                   'world',
   -0.05, 96, 'Thomson Reuters', '#FA6400'),
  ('Associated Press',   'ap',       'Long-running cooperative wire service.',
   'https://feeds.apnews.com/rss/apf-topnews',
   'https://apnews.com/',                                        'world',
   -0.02, 95, 'AP Cooperative', '#0a4d8c'),
  ('BBC News',           'bbc',      'British public service broadcaster.',
   'https://feeds.bbci.co.uk/news/world/rss.xml',
   'https://www.bbc.com/news/world',                             'world',
   -0.15, 92, 'British Broadcasting Corporation', '#bb1919'),
  ('Wall Street Journal','wsj',      'Business-led national daily.',
   'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
   'https://www.wsj.com/',                                       'business',
   0.35,  88, 'News Corp', '#000000'),
  ('The Guardian',       'guardian', 'British daily, left-leaning op-ed.',
   'https://www.theguardian.com/world/rss',
   'https://www.theguardian.com/',                               'world',
   -0.45, 87, 'Scott Trust Limited', '#052962'),
  ('Fox News',           'fox',      'US cable news network.',
   'https://feeds.foxnews.com/foxnews/latest',
   'https://www.foxnews.com/',                                   'world',
   0.65,  78, 'Fox Corporation', '#003366'),
  ('The New York Times', 'nyt',      'US national daily, broad coverage.',
   'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
   'https://www.nytimes.com/',                                   'world',
   -0.25, 90, 'The New York Times Company', '#000000'),
  ('TechCrunch',         'tc',       'Tech industry trade publication.',
   'https://techcrunch.com/feed/',
   'https://techcrunch.com/',                                    'tech',
   -0.08, 82, 'Yahoo Inc.', '#0a9c47')
) AS s(
  name, slug, description, feed_url, website_url, category_slug,
  bias_value, factual_rating, ownership, accent_color
)
JOIN news_categories c ON c.slug = s.category_slug
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  feed_url = EXCLUDED.feed_url,
  website_url = EXCLUDED.website_url,
  category_id = EXCLUDED.category_id,
  bias_value = EXCLUDED.bias_value,
  factual_rating = EXCLUDED.factual_rating,
  ownership = EXCLUDED.ownership,
  accent_color = EXCLUDED.accent_color,
  is_active = EXCLUDED.is_active;

-- Stories. We seed them with deterministic UUIDs derived from the slug so
-- re-runs are idempotent and re-seeding doesn't churn ids that the frontend
-- has cached. published_at is bucketed at hours-ago so the UI shows a
-- realistic mix of "12m ago" / "47m ago" / "2h ago" timestamps.
INSERT INTO articles (
  id, category_id, title, url, excerpt, content, image_url,
  bias_score, source_count, published_at
)
SELECT
  a.id::uuid, c.id, a.title, a.url, a.excerpt, a.content, NULL,
  a.bias_score, a.source_count, NOW() - (a.minutes_ago || ' minutes')::interval
FROM (VALUES
  ('11111111-1111-4111-8111-000000000001', 'world',
   'Climate summit lands a deal — five outlets, five framings.',
   '/stories/11111111-1111-4111-8111-000000000001',
   'Reuters calls it a breakthrough. Fox calls it a giveaway. The Guardian calls it overdue. Vantage stacks them for you.',
   'After 14 days of negotiation the climate summit closed with a framework agreement covering fossil-fuel subsidies, methane caps, and a green fund. Compliance language remains contested.',
   -0.20, 7,  12),
  ('11111111-1111-4111-8111-000000000002', 'business',
   'Fed signals a quarter-point cut as inflation cools.',
   '/stories/11111111-1111-4111-8111-000000000002',
   'Markets rallied on the dovish statement. Centrist outlets focused on the data; left-leaning coverage flagged housing risk; right-leaning highlighted growth optimism.',
   'The Federal Reserve voted 11-1 to cut the policy rate by 25bp, citing softer core PCE inflation and a labour market that has come into better balance.',
   0.15,  9,  47),
  ('11111111-1111-4111-8111-000000000003', 'tech',
   'Open-source AI bill clears committee with bipartisan support.',
   '/stories/11111111-1111-4111-8111-000000000003',
   'The bill exempts academic projects from licensing. TechCrunch frames it as a win; Fox emphasises deregulation; The Verge questions enforceability.',
   'A bipartisan committee advanced the bill 18-2. Academic projects with revenue under $5M annually are fully exempt from the new model-licensing regime.',
   -0.10, 11, 120),
  ('11111111-1111-4111-8111-000000000004', 'science',
   'James Webb spots oldest supernova on record, 12 billion light-years out.',
   '/stories/11111111-1111-4111-8111-000000000004',
   'Confirmed by spectroscopy this week. Science outlets emphasise the cosmology implication; mainstream outlets focused on the visual.',
   'The supernova, designated AT2024-cosm, was confirmed as the most distant Type Ia ever observed. The light reached Webb after travelling 12.1 billion years.',
   -0.05, 5,  240),
  ('11111111-1111-4111-8111-000000000005', 'sports',
   'World Cup final delivers extra-time drama in front of 78,000.',
   '/stories/11111111-1111-4111-8111-000000000005',
   'Penalties. Late-game tactics. The framing across outlets is mostly cosmetic — bias minimal — but coverage angles vary by region.',
   'After 90 minutes ended scoreless, two extra-time goals brought the match alive. Penalties were ultimately required to settle the title.',
   0.02,  14, 360),
  ('11111111-1111-4111-8111-000000000006', 'culture',
   'Museum agrees to return contested bronzes after ten-year campaign.',
   '/stories/11111111-1111-4111-8111-000000000006',
   'Cultural restitution stories diverge sharply by outlet. Left-leaning coverage celebrates; conservative outlets question precedent; international press leans neutral.',
   'A ten-year restitution campaign has concluded with the museum agreeing to transfer the contested bronzes to the originating government within 18 months.',
   -0.30, 6,  540),
  ('11111111-1111-4111-8111-000000000007', 'business',
   'Biotech merger creates third-largest player in oncology research.',
   '/stories/11111111-1111-4111-8111-000000000007',
   'Wall Street outlets flag valuation; FT focuses on pipeline; trade press questions antitrust risk.',
   'The all-stock merger values the combined entity at $48B and consolidates two of the largest oncology pipelines in the industry.',
   0.22,  8,  840),
  ('11111111-1111-4111-8111-000000000008', 'tech',
   'New chip-export rules tighten Pacific tech corridor.',
   '/stories/11111111-1111-4111-8111-000000000008',
   'Bloomberg framed as policy update; right-leaning outlets emphasise national security; left-leaning press interrogates economic fallout.',
   'The new licensing regime adds nine sub-7nm process nodes to the export-control list and tightens end-user reporting on advanced AI accelerators.',
   -0.08, 13, 1080),
  ('11111111-1111-4111-8111-000000000009', 'entertainment',
   'Streaming giant cuts back original films as bundling era begins.',
   '/stories/11111111-1111-4111-8111-000000000009',
   'Trade press frames it as inevitable consolidation; mainstream outlets focused on layoffs; Verge questioned strategy.',
   'The platform announced a 35% cut to the originals slate alongside a new bundling agreement with two competitors set to launch next quarter.',
   -0.12, 9,  1320)
) AS a(
  id, category_slug, title, url, excerpt, content, bias_score, source_count, minutes_ago
)
JOIN news_categories c ON c.slug = a.category_slug
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  url = EXCLUDED.url,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  bias_score = EXCLUDED.bias_score,
  source_count = EXCLUDED.source_count;

-- Per-source coverage variations. These are what render under "How each
-- outlet framed it" on /stories/:id.
DELETE FROM story_coverage WHERE article_id IN (
  SELECT id FROM articles WHERE id::text LIKE '11111111-1111-4111-8111-%'
);

INSERT INTO story_coverage (
  article_id, source_id, headline, excerpt, url, published_at
)
SELECT
  cov.article_id::uuid, src.id, cov.headline, cov.excerpt, cov.url,
  NOW() - (cov.minutes_ago || ' minutes')::interval
FROM (VALUES
  -- Climate summit (story 1)
  ('11111111-1111-4111-8111-000000000001', 'reuters',
   'Climate deal reached as negotiators clear last-minute objections.',
   'Officials describe the framework as the most concrete commitment to phase down fossil-fuel subsidies in a decade.',
   'https://www.reuters.com/world/climate-deal-reached/', 14),
  ('11111111-1111-4111-8111-000000000001', 'guardian',
   'A long-overdue deal — and why activists say it still falls short.',
   'Campaigners welcomed the deal in principle but pointed to vague compliance terms and a notable absence of binding penalties.',
   'https://www.theguardian.com/environment/climate-deal/', 22),
  ('11111111-1111-4111-8111-000000000001', 'fox',
   'Climate deal expands government''s reach over US energy markets.',
   'Critics warn that the framework imposes new compliance costs on domestic producers without securing similar commitments abroad.',
   'https://www.foxnews.com/politics/climate-deal/', 30),
  ('11111111-1111-4111-8111-000000000001', 'wsj',
   'Investors weigh the climate deal as energy stocks slide.',
   'Analysts split on whether the new compliance regime accelerates the clean-energy capex cycle or prolongs uncertainty.',
   'https://www.wsj.com/articles/climate-deal-investors/', 38),
  ('11111111-1111-4111-8111-000000000001', 'bbc',
   'Climate summit ends with a deal — what it means for the world.',
   'Explained: which commitments are new, which were already in motion, and which countries pushed back hardest.',
   'https://www.bbc.com/news/climate-deal-explained/', 45),
  ('11111111-1111-4111-8111-000000000001', 'ap',
   'Negotiators reach climate framework after marathon talks.',
   'The agreement covers methane caps, fossil-fuel subsidies, and a green-fund pledge that more than doubles the prior baseline.',
   'https://apnews.com/article/climate-summit-deal/', 18),
  ('11111111-1111-4111-8111-000000000001', 'nyt',
   'A climate deal — and the messy work that begins now.',
   'For all the symbolism of the closing gavel, the hardest part is what happens next: implementation, monitoring, and the inevitable disputes.',
   'https://www.nytimes.com/article/climate-deal/', 25),
  -- Fed rate cut (story 2)
  ('11111111-1111-4111-8111-000000000002', 'reuters',
   'Fed cuts rates 25bp as inflation cools, vote 11-1.',
   'The decision came with revised dot-plot guidance suggesting two further cuts this year if core PCE continues to soften.',
   'https://www.reuters.com/markets/us/fed-cut/', 50),
  ('11111111-1111-4111-8111-000000000002', 'wsj',
   'Powell signals more cuts ahead as Fed eases.',
   'Markets cheered the dovish statement; the Russell 2000 outperformed on rate-sensitivity.',
   'https://www.wsj.com/articles/fed-cut/', 55),
  ('11111111-1111-4111-8111-000000000002', 'guardian',
   'Fed cut welcome, but housing affordability remains the question.',
   'Even with rate relief, the housing market remains structurally undersupplied — a point that mortgage-rate moves alone cannot solve.',
   'https://www.theguardian.com/business/fed-cut/', 60),
  ('11111111-1111-4111-8111-000000000002', 'fox',
   'Fed cut signals economy stronger than critics admit.',
   'The decision validates pro-growth policy, with markets responding positively and labour metrics holding firm.',
   'https://www.foxnews.com/politics/fed-cut/', 62),
  ('11111111-1111-4111-8111-000000000002', 'bbc',
   'US Fed cuts interest rates as inflation eases.',
   'The move is widely seen as the start of a measured easing cycle, with global central banks watching closely.',
   'https://www.bbc.com/news/business/fed-cut/', 65),
  -- Open-source AI (story 3)
  ('11111111-1111-4111-8111-000000000003', 'tc',
   'Open-source AI bill clears committee — what''s in it.',
   'Academic exemption survived markup; a tight reporting carve-out covers smaller fine-tuned derivatives.',
   'https://techcrunch.com/2024/ai-bill/', 130),
  ('11111111-1111-4111-8111-000000000003', 'reuters',
   'US lawmakers advance open-source AI legislation.',
   'The bill targets a narrow class of frontier models above a parameter and revenue threshold.',
   'https://www.reuters.com/technology/ai-bill/', 140),
  ('11111111-1111-4111-8111-000000000003', 'wsj',
   'AI rules clear a hurdle as industry braces for compliance.',
   'Compliance officers at major labs are mobilising even though final passage remains uncertain.',
   'https://www.wsj.com/articles/ai-bill/', 150),
  ('11111111-1111-4111-8111-000000000003', 'guardian',
   'Open-source AI gets a reprieve — but enforcement is the test.',
   'Carve-outs for academic projects survived, but enforcement infrastructure remains undefined.',
   'https://www.theguardian.com/technology/ai-bill/', 155),
  -- Webb supernova (story 4)
  ('11111111-1111-4111-8111-000000000004', 'bbc',
   'Webb telescope spots earliest known supernova.',
   'The Type Ia event is the most distant of its kind ever observed, offering a new probe of cosmic expansion.',
   'https://www.bbc.com/news/science/webb-supernova/', 250),
  ('11111111-1111-4111-8111-000000000004', 'nyt',
   'Webb finds a 12-billion-year-old supernova.',
   'The detection refines tests of cosmic expansion in the early universe.',
   'https://www.nytimes.com/science/webb-supernova/', 260),
  ('11111111-1111-4111-8111-000000000004', 'reuters',
   'Spectroscopy confirms most distant supernova on record.',
   'The team used Webb''s NIRSpec to confirm the redshift and Type Ia classification.',
   'https://www.reuters.com/science/webb-supernova/', 268),
  -- World cup (story 5)
  ('11111111-1111-4111-8111-000000000005', 'reuters',
   'World Cup final settled on penalties.',
   'After two extra-time goals, penalties decided the title in front of 78,000 fans.',
   'https://www.reuters.com/sports/world-cup-final/', 370),
  ('11111111-1111-4111-8111-000000000005', 'bbc',
   'World Cup final goes to penalties as drama unfolds.',
   'Tactical adjustments at 78 minutes shaped the closing chapters of the match.',
   'https://www.bbc.com/sport/world-cup-final/', 375),
  ('11111111-1111-4111-8111-000000000005', 'nyt',
   'A world cup final that lived up to the hype.',
   'Both sides traded chances late before extra time and penalties produced a champion.',
   'https://www.nytimes.com/sports/world-cup-final/', 380),
  -- Museum bronzes (story 6)
  ('11111111-1111-4111-8111-000000000006', 'guardian',
   'Restitution agreed: museum to return contested bronzes.',
   'A ten-year campaign closes with a transfer agreement scheduled for the next 18 months.',
   'https://www.theguardian.com/culture/restitution/', 550),
  ('11111111-1111-4111-8111-000000000006', 'bbc',
   'Museum to repatriate contested bronzes after long campaign.',
   'The institution had previously argued the works were lawfully acquired.',
   'https://www.bbc.com/news/culture/restitution/', 560),
  ('11111111-1111-4111-8111-000000000006', 'fox',
   'Museum sets restitution precedent — critics warn of overreach.',
   'Some curators worry the decision sets a precedent that could destabilise other long-standing collections.',
   'https://www.foxnews.com/world/restitution/', 570),
  -- Biotech merger (story 7)
  ('11111111-1111-4111-8111-000000000007', 'wsj',
   'Biotech merger creates new oncology giant.',
   'The all-stock combination values the new entity at $48B with a pipeline spanning 14 ongoing trials.',
   'https://www.wsj.com/articles/biotech-merger/', 850),
  ('11111111-1111-4111-8111-000000000007', 'reuters',
   'Oncology M&A: deal announced, regulatory review awaited.',
   'Antitrust attention is expected to focus on the small-molecule overlap and a particular HER2 program.',
   'https://www.reuters.com/business/biotech-merger/', 860),
  -- Chip exports (story 8)
  ('11111111-1111-4111-8111-000000000008', 'tc',
   'New chip-export rules: what changes for companies.',
   'Nine new process nodes and tighter reporting requirements add complexity to the licensing pathway.',
   'https://techcrunch.com/chip-exports/', 1090),
  ('11111111-1111-4111-8111-000000000008', 'wsj',
   'Chip-export rules tighten further as Pacific tensions rise.',
   'Companies are recalibrating revenue forecasts as new compliance overhead lands.',
   'https://www.wsj.com/articles/chip-exports/', 1095),
  ('11111111-1111-4111-8111-000000000008', 'fox',
   'New chip rules: a national-security win.',
   'The administration framed the new licensing regime as a critical defence against advanced-AI proliferation.',
   'https://www.foxnews.com/politics/chip-exports/', 1100),
  ('11111111-1111-4111-8111-000000000008', 'guardian',
   'Chip exports: tighter rules, broader economic fallout.',
   'Trade groups warn the new requirements will tilt the playing field toward larger incumbents.',
   'https://www.theguardian.com/technology/chip-exports/', 1110),
  -- Streaming (story 9)
  ('11111111-1111-4111-8111-000000000009', 'tc',
   'Streamer cuts originals slate by 35% as bundling era kicks off.',
   'The platform also announced a new bundle agreement with two competitors targeting next quarter.',
   'https://techcrunch.com/streaming-cuts/', 1330),
  ('11111111-1111-4111-8111-000000000009', 'nyt',
   'A streaming giant retreats: cuts and a new bundle.',
   'Industry watchers see the bundle as the clearest sign yet of consolidation in the post-streaming-wars era.',
   'https://www.nytimes.com/business/media/streaming-cuts/', 1340)
) AS cov(article_id, source_slug, headline, excerpt, url, minutes_ago)
JOIN sources src ON src.slug = cov.source_slug;
