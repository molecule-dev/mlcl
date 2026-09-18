-- Seed data for meditation-app: real meditation categories, sessions, and
-- a 7-day course. Without this, the Library, Home, Courses, and Search pages
-- show no real content and the SessionPlayer can't resolve any session id.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.

INSERT INTO public.meditation_categories (id, slug, label, description, hero_image_key, display_order, is_active)
VALUES
    (gen_random_uuid(), 'mindfulness', 'Mindfulness', 'Stay present, one breath at a time.',  NULL, 1, true),
    (gen_random_uuid(), 'sleep',       'Sleep',       'Wind down with stories and slow breathing.', NULL, 2, true),
    (gen_random_uuid(), 'focus',       'Focus',       'Sharpen attention before deep work.',  NULL, 3, true),
    (gen_random_uuid(), 'stress',      'Stress relief','Soft sessions for tense afternoons.',  NULL, 4, true),
    (gen_random_uuid(), 'body',        'Body',        'Release tension through movement and awareness.', NULL, 5, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.meditation_sessions
    (id, category_id, slug, title, description, duration_seconds, difficulty, instructor_name, audio_s3_key, hero_image_key, language, is_premium, is_published, published_at)
VALUES
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'stress'),
        'today-tension', 'Letting go of tension',
        'A guided 12-minute body scan. Start with the breath, soften the jaw and shoulders, end resting in the chest.',
        720, 'beginner', 'Maya Iyer', 'audio/letting-go-of-tension.mp3', NULL, 'en', false, true, now()),
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'focus'),
        'morning-focus', 'Morning focus',
        'A bright start to settle the mind before deep work.',
        600, 'beginner', 'Daichi Mori', 'audio/morning-focus.mp3', NULL, 'en', false, true, now()),
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'mindfulness'),
        'breath-of-calm', 'Breath of calm',
        'Slow box-breath to soften a racing afternoon.',
        480, 'beginner', 'Lena Park', 'audio/breath-of-calm.mp3', NULL, 'en', false, true, now()),
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'sleep'),
        'wind-down', 'Wind-down for sleep',
        'Drift off to a slow body-scan with ambient sound.',
        1080, 'beginner', 'Saoirse Quinn', 'audio/wind-down.mp3', NULL, 'en', false, true, now()),
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'body'),
        'walking-meditation', 'Walking meditation',
        'Notice the ground with each step.',
        900, 'intermediate', 'Kofi Mensah', 'audio/walking-meditation.mp3', NULL, 'en', false, true, now()),
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'mindfulness'),
        'loving-kindness', 'Loving-kindness',
        'Soften toward yourself and others.',
        840, 'beginner', 'Maya Iyer', 'audio/loving-kindness.mp3', NULL, 'en', true, true, now()),
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'sleep'),
        'shoreline-story', 'Sleep stories: shoreline',
        'A slow narrative over ocean ambience.',
        1320, 'beginner', 'Saoirse Quinn', 'audio/shoreline-story.mp3', NULL, 'en', true, true, now()),
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'focus'),
        'box-breath', 'Box breath, 4-4-4-4',
        'A short coherent-breath reset.',
        300, 'beginner', 'Lena Park', 'audio/box-breath.mp3', NULL, 'en', false, true, now()),
    (gen_random_uuid(),
        (SELECT id FROM public.meditation_categories WHERE slug = 'stress'),
        'anxiety-down-regulator', 'Anxiety down-regulator',
        'Slow exhales for a tense moment.',
        660, 'intermediate', 'Daichi Mori', 'audio/anxiety-down-regulator.mp3', NULL, 'en', false, true, now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.meditation_courses (id, slug, title, description, day_count, hero_image_key, is_premium, is_published)
VALUES
    (gen_random_uuid(), 'foundations', 'Foundations of stillness',
        'A 7-day intro to settling the mind. One short session a day.',
        7, NULL, false, true),
    (gen_random_uuid(), 'sleep-better-week', 'Sleep better in 7 days',
        'A bedtime ritual built around slow breath and body scan.',
        7, NULL, true, true)
ON CONFLICT (slug) DO NOTHING;

-- Wire course days to existing sessions so the course-detail page
-- has real content to render. We pick canonical sessions per slot.
INSERT INTO public.meditation_course_days (course_id, day_number, session_id, title, prep_text)
SELECT c.id, 1, s.id, 'Day 1 — Settle in', 'Sit upright, close the eyes, follow the breath.'
FROM public.meditation_courses c, public.meditation_sessions s
WHERE c.slug = 'foundations' AND s.slug = 'breath-of-calm'
  AND NOT EXISTS (SELECT 1 FROM public.meditation_course_days WHERE course_id = c.id AND day_number = 1);

INSERT INTO public.meditation_course_days (course_id, day_number, session_id, title, prep_text)
SELECT c.id, 2, s.id, 'Day 2 — Body scan', 'Soften the jaw, shoulders, hands.'
FROM public.meditation_courses c, public.meditation_sessions s
WHERE c.slug = 'foundations' AND s.slug = 'today-tension'
  AND NOT EXISTS (SELECT 1 FROM public.meditation_course_days WHERE course_id = c.id AND day_number = 2);

INSERT INTO public.meditation_course_days (course_id, day_number, session_id, title, prep_text)
SELECT c.id, 3, s.id, 'Day 3 — Focus', 'Notice the breath six times, then begin.'
FROM public.meditation_courses c, public.meditation_sessions s
WHERE c.slug = 'foundations' AND s.slug = 'morning-focus'
  AND NOT EXISTS (SELECT 1 FROM public.meditation_course_days WHERE course_id = c.id AND day_number = 3);

INSERT INTO public.meditation_course_days (course_id, day_number, session_id, title, prep_text)
SELECT c.id, 4, s.id, 'Day 4 — Walking', 'Take it outdoors. Match the breath to your steps.'
FROM public.meditation_courses c, public.meditation_sessions s
WHERE c.slug = 'foundations' AND s.slug = 'walking-meditation'
  AND NOT EXISTS (SELECT 1 FROM public.meditation_course_days WHERE course_id = c.id AND day_number = 4);

INSERT INTO public.meditation_course_days (course_id, day_number, session_id, title, prep_text)
SELECT c.id, 5, s.id, 'Day 5 — Loving-kindness', 'Direct goodwill inward, then out.'
FROM public.meditation_courses c, public.meditation_sessions s
WHERE c.slug = 'foundations' AND s.slug = 'loving-kindness'
  AND NOT EXISTS (SELECT 1 FROM public.meditation_course_days WHERE course_id = c.id AND day_number = 5);

INSERT INTO public.meditation_course_days (course_id, day_number, session_id, title, prep_text)
SELECT c.id, 6, s.id, 'Day 6 — Box breath', 'Five rounds of 4-4-4-4. Notice what changes.'
FROM public.meditation_courses c, public.meditation_sessions s
WHERE c.slug = 'foundations' AND s.slug = 'box-breath'
  AND NOT EXISTS (SELECT 1 FROM public.meditation_course_days WHERE course_id = c.id AND day_number = 6);

INSERT INTO public.meditation_course_days (course_id, day_number, session_id, title, prep_text)
SELECT c.id, 7, s.id, 'Day 7 — Rest', 'Drift off easily. Let go of the day.'
FROM public.meditation_courses c, public.meditation_sessions s
WHERE c.slug = 'foundations' AND s.slug = 'wind-down'
  AND NOT EXISTS (SELECT 1 FROM public.meditation_course_days WHERE course_id = c.id AND day_number = 7);

-- Sleep-better-week course days
INSERT INTO public.meditation_course_days (course_id, day_number, session_id, title, prep_text)
SELECT c.id, n.day_number, n.session_id, n.title, n.prep_text
FROM public.meditation_courses c
CROSS JOIN LATERAL (
    SELECT 1 AS day_number, (SELECT id FROM public.meditation_sessions WHERE slug = 'wind-down') AS session_id, 'Day 1 — Settle' AS title, 'Lights low. Breath slow.' AS prep_text
    UNION ALL SELECT 2, (SELECT id FROM public.meditation_sessions WHERE slug = 'shoreline-story'), 'Day 2 — Shoreline', 'Lie back. Let the story carry you.'
    UNION ALL SELECT 3, (SELECT id FROM public.meditation_sessions WHERE slug = 'box-breath'), 'Day 3 — Slow breath', 'Five rounds of 4-4-4-4 in bed.'
    UNION ALL SELECT 4, (SELECT id FROM public.meditation_sessions WHERE slug = 'today-tension'), 'Day 4 — Body release', 'Soften the jaw before lights out.'
    UNION ALL SELECT 5, (SELECT id FROM public.meditation_sessions WHERE slug = 'wind-down'), 'Day 5 — Body scan', 'Head to toe, slowly.'
    UNION ALL SELECT 6, (SELECT id FROM public.meditation_sessions WHERE slug = 'breath-of-calm'), 'Day 6 — Calm breath', 'Lengthen the exhale.'
    UNION ALL SELECT 7, (SELECT id FROM public.meditation_sessions WHERE slug = 'wind-down'), 'Day 7 — Drift', 'Let the practice carry you to sleep.'
) n
WHERE c.slug = 'sleep-better-week'
  AND NOT EXISTS (SELECT 1 FROM public.meditation_course_days WHERE course_id = c.id AND day_number = n.day_number);
