-- Seed canonical subs + demo links so a fresh install has a populated
-- front page from the moment the first user signs up. Without this, the
-- Landing/Feed pages would show "Nothing here yet" and the SubmitLink
-- form's hardcoded sub picker would post against subs that don't exist.
--
-- Idempotent — re-running is a no-op via deterministic UUIDs +
-- ON CONFLICT clauses.

-- 1) System user that owns the seed content. Deterministic UUID so this
--    file stays idempotent across replays. usersSecrets gets a junk
--    bcrypt hash so the account exists but cannot log in.
INSERT INTO public.users (id, "createdAt", "updatedAt", username, name, email, karma, bio)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  now(), now(),
  'digest-bot', 'Digest', 'digest-bot@example.com',
  0, 'Founding stones for the cairn.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."usersSecrets" (id, "passwordHash")
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali'
)
ON CONFLICT (id) DO NOTHING;

-- 2) Canonical sub-communities. Slug-keyed UUIDs make later inserts
--    referenceable without subselects.
INSERT INTO public.subs (id, name, slug, description, owner_id, member_count, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-00000000a001'::uuid, 'general',   'general',   'Open discussion — anything that doesn''t fit a more specific sub.',                  '00000000-0000-4000-8000-000000000001'::uuid, 1, now(), now()),
  ('00000000-0000-4000-8000-00000000a002'::uuid, 'design',    'design',    'Interfaces, type, and the small details that make them feel right.',                 '00000000-0000-4000-8000-000000000001'::uuid, 1, now(), now()),
  ('00000000-0000-4000-8000-00000000a003'::uuid, 'databases', 'databases', 'Schema design, query plans, and operational war stories.',                          '00000000-0000-4000-8000-000000000001'::uuid, 1, now(), now()),
  ('00000000-0000-4000-8000-00000000a004'::uuid, 'reading',   'reading',   'Long essays, books worth marking, and a slow share queue.',                          '00000000-0000-4000-8000-000000000001'::uuid, 1, now(), now()),
  ('00000000-0000-4000-8000-00000000a005'::uuid, 'webdev',    'webdev',    'Web frameworks, browser quirks, and the trade-offs nobody talks about.',             '00000000-0000-4000-8000-000000000001'::uuid, 1, now(), now()),
  ('00000000-0000-4000-8000-00000000a006'::uuid, 'meta',      'meta',      'Talk about Digest itself — feature ideas, moderation, the slow web.',                '00000000-0000-4000-8000-000000000001'::uuid, 1, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3) System user is a member of every seeded sub (matches the `member_count = 1` above).
INSERT INTO public.sub_memberships (id, sub_id, user_id, joined_at, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-00000000b001'::uuid, '00000000-0000-4000-8000-00000000a001'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, now(), now(), now()),
  ('00000000-0000-4000-8000-00000000b002'::uuid, '00000000-0000-4000-8000-00000000a002'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, now(), now(), now()),
  ('00000000-0000-4000-8000-00000000b003'::uuid, '00000000-0000-4000-8000-00000000a003'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, now(), now(), now()),
  ('00000000-0000-4000-8000-00000000b004'::uuid, '00000000-0000-4000-8000-00000000a004'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, now(), now(), now()),
  ('00000000-0000-4000-8000-00000000b005'::uuid, '00000000-0000-4000-8000-00000000a005'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, now(), now(), now()),
  ('00000000-0000-4000-8000-00000000b006'::uuid, '00000000-0000-4000-8000-00000000a006'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4) Demo links — one per seeded sub so the front page has something to
--    render and SubDetail pages aren't empty for fresh users.
INSERT INTO public.links
  (id, title, url, text, domain, sub_id, sub_slug, sub_name, submitter_id, submitter_name, tags, points, comment_count, rank_score, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-00000000c001'::uuid,
    'A field guide to slow-rendered, AI-tolerant interfaces',
    'https://example.com/digest/slow-rendered',
    NULL, 'example.com',
    '00000000-0000-4000-8000-00000000a002'::uuid, 'design', 'design',
    '00000000-0000-4000-8000-000000000001'::uuid, 'digest-bot',
    '["design","ai","longread"]'::jsonb, 412, 0, 9.81, now() - interval '3 hours', now() - interval '3 hours'),

  ('00000000-0000-4000-8000-00000000c002'::uuid,
    'After three years of Postgres, I''m still finding new tricks',
    'https://blog.example.io/digest/postgres-tricks',
    NULL, 'blog.example.io',
    '00000000-0000-4000-8000-00000000a003'::uuid, 'databases', 'databases',
    '00000000-0000-4000-8000-000000000001'::uuid, 'digest-bot',
    '["postgres","databases"]'::jsonb, 264, 0, 7.36, now() - interval '7 hours', now() - interval '7 hours'),

  ('00000000-0000-4000-8000-00000000c003'::uuid,
    'Why I left X for a tiny self-hosted aggregator',
    NULL,
    'A short essay on quitting the algorithmic timeline. The TL;DR: the slow web is back, and it works.',
    NULL,
    '00000000-0000-4000-8000-00000000a006'::uuid, 'meta', 'meta',
    '00000000-0000-4000-8000-000000000001'::uuid, 'digest-bot',
    '["meta","opinion"]'::jsonb, 198, 0, 6.74, now() - interval '12 hours', now() - interval '12 hours'),

  ('00000000-0000-4000-8000-00000000c004'::uuid,
    'Why your team probably doesn''t need a microservice',
    'https://essays.example.com/digest/microservices',
    NULL, 'essays.example.com',
    '00000000-0000-4000-8000-00000000a005'::uuid, 'webdev', 'webdev',
    '00000000-0000-4000-8000-000000000001'::uuid, 'digest-bot',
    '["architecture","opinion"]'::jsonb, 164, 0, 5.20, now() - interval '14 hours', now() - interval '14 hours'),

  ('00000000-0000-4000-8000-00000000c005'::uuid,
    'The best beginner books for type theory, sorted by reader',
    'https://reading.example.org/digest/type-theory',
    NULL, 'reading.example.org',
    '00000000-0000-4000-8000-00000000a004'::uuid, 'reading', 'reading',
    '00000000-0000-4000-8000-000000000001'::uuid, 'digest-bot',
    '["books","math"]'::jsonb, 142, 0, 4.41, now() - interval '18 hours', now() - interval '18 hours'),

  ('00000000-0000-4000-8000-00000000c006'::uuid,
    'Welcome to Digest — what this place is for',
    NULL,
    'Digest is a community link aggregator: vote, discuss, and stack up the things you want other curious people to read. New here? Introduce yourself.',
    NULL,
    '00000000-0000-4000-8000-00000000a001'::uuid, 'general', 'general',
    '00000000-0000-4000-8000-000000000001'::uuid, 'digest-bot',
    '["welcome","meta"]'::jsonb, 88, 0, 3.10, now() - interval '1 day', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- 5) Auto-upvote each seeded link by the submitter (so points stay > 0
--    and the feed UI's user_vote denormalisation reflects an existing row).
INSERT INTO public.votes (id, link_id, user_id, direction, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-00000000d001'::uuid, '00000000-0000-4000-8000-00000000c001'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, 'up', now(), now()),
  ('00000000-0000-4000-8000-00000000d002'::uuid, '00000000-0000-4000-8000-00000000c002'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, 'up', now(), now()),
  ('00000000-0000-4000-8000-00000000d003'::uuid, '00000000-0000-4000-8000-00000000c003'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, 'up', now(), now()),
  ('00000000-0000-4000-8000-00000000d004'::uuid, '00000000-0000-4000-8000-00000000c004'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, 'up', now(), now()),
  ('00000000-0000-4000-8000-00000000d005'::uuid, '00000000-0000-4000-8000-00000000c005'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, 'up', now(), now()),
  ('00000000-0000-4000-8000-00000000d006'::uuid, '00000000-0000-4000-8000-00000000c006'::uuid, '00000000-0000-4000-8000-000000000001'::uuid, 'up', now(), now())
ON CONFLICT (id) DO NOTHING;
