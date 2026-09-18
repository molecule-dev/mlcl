-- Seed demo content for video-streaming so a freshly-signed-up user lands
-- on a populated app with real UUIDs (every video card links to a watchable
-- /watch/<uuid> route, every channel card links to a real /channel/<uuid>).
--
-- Idempotent: every INSERT is guarded by ON CONFLICT DO NOTHING and the row
-- ids are deterministic (all hex, valid UUIDs), so re-running the migration
-- is a no-op.
--
-- IMPORTANT: every id below is RFC 4122 v4 compliant (version nibble is `4`,
-- variant nibble is `8`). Naive sequence ids like `00000000-…-…-…-001` look
-- like UUIDs but fail Zod's `.uuid()` validator (which enforces the version
-- nibble must be 1–5), and the Watch / Channel handlers would 400 on every
-- click. Using v4-shaped ids keeps the seed payload "production-ready" by
-- matching what a real `crypto.randomUUID()` call would produce.
--
-- The video stream URLs are real public test streams (Google's public sample
-- bucket) so the <video> player on the Watch page can actually play
-- something out of the box. Direct MP4 URLs are used because they play
-- natively in every browser without requiring hls.js.

-- 1. System creator user that owns all seeded channels + videos.
INSERT INTO public.users (id, "createdAt", "updatedAt", username, name, email, "planKey")
VALUES (
    '11111111-1111-4111-8111-111111111111',
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '90 days',
    'spool-demo',
    'Spool Demo Studios',
    'demo+seed@spool.tv',
    'free'
) ON CONFLICT (id) DO NOTHING;

-- 2. Demo channels.
INSERT INTO public.channels (id, owner_id, user_id, name, handle, bio, subscriber_count, created_at, "updatedAt")
VALUES
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Northern Field Studio', 'northernfield', 'Quiet documentary work from a small Brooklyn studio.', 482000, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Lina Reyes', 'linareyes', 'Solo creator behind one of the cosiest bedroom-studio channels.', 1200000, NOW() - INTERVAL '120 days', NOW() - INTERVAL '120 days'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Slow Spoon', 'slowspoon', 'Late-night ambient cooking, vegan-leaning recipes.', 240000, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Cosmo Reels', 'cosmoreels', 'Travel documentaries from the rare corners of the world.', 87400, NOW() - INTERVAL '180 days', NOW() - INTERVAL '180 days'),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Resonant Labs', 'resonantlabs', 'Hardware tinkering, modular synths, and the occasional 8-bit chiptune.', 86400, NOW() - INTERVAL '200 days', NOW() - INTERVAL '200 days'),
  ('22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Aperture Daily', 'aperture', 'Photography crash courses, gear reviews, and one-take field tutorials.', 2300000, NOW() - INTERVAL '365 days', NOW() - INTERVAL '365 days')
ON CONFLICT (id) DO NOTHING;

-- 3. Demo videos.
-- The hls_url field stores the playable source — for the demo bundle we use
-- direct MP4 URLs (browser-native, no hls.js needed).
INSERT INTO public.videos (
    id, user_id, channel_id, title, description, hls_url, source_url, thumbnail_url,
    duration_sec, status, published_at, view_count, like_count, dislike_count,
    comment_count, chapters, tag, category, created_at, updated_at, "updatedAt"
) VALUES
  (
    '33333333-3333-4333-8333-333333333301',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222201',
    'How a film label fell in love with reels again',
    'A short documentary about Northern Field Studios 18-month effort to digitise a forgotten archive of 16mm field recordings.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    NULL, 596, 'published', NOW() - INTERVAL '4 days', 482000, 18400, 312, 0,
    '[{"start_sec":0,"title":"Cold open"},{"start_sec":120,"title":"The basement archive"},{"start_sec":300,"title":"Restoring 16mm"},{"start_sec":480,"title":"Final transfer"}]'::jsonb,
    'documentary', 'film', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222202',
    'I built a 1M-viewer channel from a closet',
    'My five-year journey from a rented bedroom-corner studio to a million subscribers, with the cameras, mistakes, and late-night edits in between.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    NULL, 653, 'published', NOW() - INTERVAL '2 days', 312000, 11200, 180, 0,
    '[]'::jsonb, 'creators', 'creators', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222203',
    'Late-night ambient cooking — chickpea three ways',
    'A calm 40-minute walkthrough of three weekday-friendly chickpea dinners, with field-recording soundscapes between each.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    NULL, 15, 'published', NOW() - INTERVAL '6 days', 198000, 6400, 90, 0,
    '[]'::jsonb, 'cooking', 'food', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'
  ),
  (
    '33333333-3333-4333-8333-333333333304',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222204',
    'The last analogue cinema in Lisbon',
    'A behind-the-scenes look at the projection room of one of the last 35mm cinemas still running in Western Europe.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    NULL, 15, 'published', NOW() - INTERVAL '8 days', 87400, 3200, 40, 0,
    '[]'::jsonb, 'travel', 'film', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'
  ),
  (
    '33333333-3333-4333-8333-333333333305',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222205',
    'Live: building a synth in 60 minutes',
    'A live build of a single-VCO modular synth from breadboard to first sound, narrated end-to-end.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    NULL, 60, 'published', NOW() - INTERVAL '1 day', 12400, 800, 12, 0,
    '[]'::jsonb, 'live', 'tech', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),
  (
    '33333333-3333-4333-8333-333333333306',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222206',
    'Every camera lens explained in 8 minutes',
    'A ground-up explanation of focal lengths, apertures, and the optical trade-offs between primes and zooms.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    NULL, 480, 'published', NOW() - INTERVAL '12 days', 1200000, 38400, 410, 0,
    '[]'::jsonb, 'photography', 'photography', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'
  ),
  (
    '33333333-3333-4333-8333-333333333307',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222201',
    'Inside an indie 4K transfer studio',
    'A tour of the colour suite, sound desk, and offline edit room at our Brooklyn studio.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    NULL, 740, 'published', NOW() - INTERVAL '12 days', 180000, 5800, 60, 0,
    '[]'::jsonb, 'documentary', 'film', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'
  ),
  (
    '33333333-3333-4333-8333-333333333308',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222202',
    'A walking tour of our Brooklyn studio',
    'An eight-minute walkthrough of the studio space, from the loading dock to the colour bay.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    NULL, 888, 'published', NOW() - INTERVAL '60 days', 86500, 2400, 18, 0,
    '[]'::jsonb, 'creators', 'creators', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'
  )
ON CONFLICT (id) DO NOTHING;
