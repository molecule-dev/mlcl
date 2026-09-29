-- Design-coverage videos: the Stitch design's sample titles, seeded as real
-- watchable rows so the landing/home/search/playlist surfaces match the
-- designed catalog. Deterministic v4-shaped ids, ON CONFLICT DO NOTHING.
-- Off-Tempo (the design's lofi channel) is added to the seeded channel set —
-- it already exists in api/fixtures/channels.json as c-7.

INSERT INTO public.channels (id, owner_id, user_id, name, handle, bio, subscriber_count, created_at, "updatedAt")
VALUES (
    '22222222-2222-4222-8222-222222222207',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Off-Tempo',
    'offtempo',
    'Music-theory deep-dives, lo-fi radio, and full-set festival uploads.',
    156000,
    NOW() - INTERVAL '150 days',
    NOW() - INTERVAL '150 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.videos (
    id, user_id, channel_id, title, description, hls_url, source_url, thumbnail_url,
    duration_sec, status, published_at, view_count, like_count, dislike_count,
    comment_count, chapters, tag, category, created_at, updated_at, "updatedAt"
) VALUES
  (
    '33333333-3333-4333-8333-333333333309',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222205',
    'Building a Quantum Computer in my Garage',
    'A hobbyist qubit rig, a cryocooler from an auction site, and six months of trial and error — documented from the workbench.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    NULL, 942, 'published', NOW() - INTERVAL '6 days', 421000, 15600, 240, 0,
    '[]'::jsonb, 'technology', 'technology', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'
  ),
  (
    '33333333-3333-4333-8333-333333333310',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222207',
    'Summer Sounds Festival - Full Set',
    'The complete headline set, recorded front-of-house in one take. No talking, no cuts — just the music.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    NULL, 3240, 'published', NOW() - INTERVAL '9 days', 268000, 9800, 96, 0,
    '[]'::jsonb, 'music', 'music', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'
  ),
  (
    '33333333-3333-4333-8333-333333333311',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222206',
    'Live Q&A: Color Grading Masterclass',
    'Ninety minutes of live grading — log footage in, graded deliverable out — with every viewer question answered on stream.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    NULL, 5410, 'live', NOW() - INTERVAL '1 hours', 12400, 890, 4, 0,
    '[]'::jsonb, 'tutorial', 'film', NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 hours', NOW() - INTERVAL '1 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333312',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222204',
    'Conquering the Swiss Alps: A 7-Day Solo Expedition',
    'Seven days above the treeline with a 12-kilo pack: the passes, the huts, and the storms in between.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    NULL, 1866, 'published', NOW() - INTERVAL '14 days', 512000, 22400, 130, 0,
    '[]'::jsonb, 'travel', 'travel', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'
  ),
  (
    '33333333-3333-4333-8333-333333333313',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222202',
    'Designing the Future of UI: Trends for 2024',
    'The interface patterns shipping this year — spatial layers, adaptive type, and the quiet death of the settings page.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    NULL, 1104, 'published', NOW() - INTERVAL '20 days', 193000, 7400, 88, 0,
    '[]'::jsonb, 'design', 'design', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'
  ),
  (
    '33333333-3333-4333-8333-333333333314',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222206',
    'Mastering Cinematic Lighting Basics',
    'Three-point lighting, motivated keys, and why one lamp beats a ring light — demonstrated scene by scene.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    NULL, 1278, 'published', NOW() - INTERVAL '26 days', 289000, 11200, 74, 0,
    '[]'::jsonb, 'tutorial', 'film', NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days'
  ),
  (
    '33333333-3333-4333-8333-333333333315',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222205',
    'Blender Tutorials 2024',
    'The full beginner-to-render pipeline for this year''s Blender: modelling, shading, geometry nodes, and a final turntable.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    NULL, 2280, 'published', NOW() - INTERVAL '32 days', 176000, 6900, 55, 0,
    '[]'::jsonb, 'tutorial', 'technology', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days'
  ),
  (
    '33333333-3333-4333-8333-333333333316',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222207',
    'lofi hip hop radio - beats to relax/study to',
    'The 24/7 stream. Chill beats, rain on the window, and a cursor that never stops blinking.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    NULL, 152, 'live', NOW() - INTERVAL '90 days', 9820000, 214000, 1800, 0,
    '[]'::jsonb, 'music', 'music', NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 minutes', NOW() - INTERVAL '1 minutes'
  ),
  (
    '33333333-3333-4333-8333-333333333317',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222207',
    '1 A.M Study Session 📚 - [lofi hip hop/chill beats]',
    'A one-hour mix for the quietest hour of the night. Tape hiss, soft keys, and no distractions.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    NULL, 3600, 'published', NOW() - INTERVAL '18 days', 1240000, 43800, 320, 0,
    '[]'::jsonb, 'music', 'music', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'
  ),
  (
    '33333333-3333-4333-8333-333333333318',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222207',
    'rainy night coffee shop vibes ☕ [lofi / jazz hop / chill mix]',
    'Rain against the glass, espresso machines in the back, and a jazz-hop mix that sits underneath it all.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    NULL, 4200, 'published', NOW() - INTERVAL '25 days', 876000, 32100, 210, 0,
    '[]'::jsonb, 'music', 'music', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'
  ),
  (
    '33333333-3333-4333-8333-333333333319',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222207',
    'Midnight Stroll - LoFi Chillhop Mix',
    'Empty streets, warm streetlights, and forty minutes of chillhop built for the walk home.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    NULL, 2400, 'published', NOW() - INTERVAL '40 days', 645000, 24800, 190, 0,
    '[]'::jsonb, 'music', 'music', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'
  ),
  (
    '33333333-3333-4333-8333-333333333320',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222207',
    'Rainy Afternoon Beats 🌧️',
    'A slow, rainy set for reading, sketching, or doing absolutely nothing at all.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    NULL, 3060, 'published', NOW() - INTERVAL '52 days', 431000, 17600, 140, 0,
    '[]'::jsonb, 'music', 'music', NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days'
  ),
  (
    '33333333-3333-4333-8333-333333333321',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222207',
    'Coffee Shop Jazz & Lofi',
    'Jazz runs chopped over lo-fi drums — the soundtrack of a good café on a slow morning.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    NULL, 2760, 'published', NOW() - INTERVAL '61 days', 388000, 15400, 120, 0,
    '[]'::jsonb, 'music', 'music', NOW() - INTERVAL '61 days', NOW() - INTERVAL '61 days', NOW() - INTERVAL '61 days'
  ),
  (
    '33333333-3333-4333-8333-333333333322',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222201',
    'The Ultimate Championship Finals Highlights 2024',
    'Every decisive play from this year''s finals, cut into eight minutes with the original crowd audio.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    NULL, 480, 'published', NOW() - INTERVAL '3 days', 2140000, 88200, 640, 0,
    '[]'::jsonb, 'sports', 'sports', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  ),
  (
    '33333333-3333-4333-8333-333333333323',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222201',
    'Global Championship Finals 2024',
    'The full final, unedited — from the opening ceremony to the last point, with commentary.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    NULL, 5420, 'published', NOW() - INTERVAL '3 days', 1670000, 61500, 420, 0,
    '[]'::jsonb, 'sports', 'sports', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  )
ON CONFLICT (id) DO NOTHING;
