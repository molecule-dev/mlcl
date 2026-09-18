-- Seed three demo tutors so the marketplace has real, browseable inventory
-- on a fresh scaffold. Each demo tutor is a stand-in user (with a synthetic
-- @demo.chalk email + uuid generated deterministically by namespacing) and a
-- corresponding tutor_profile in 'active' state. Sample reviews for each
-- tutor are also seeded so review pages and rating averages have real data.
--
-- These rows are idempotent: ON CONFLICT DO NOTHING means re-running won't
-- duplicate. They use stable UUIDs so the front-end can still hard-link to
-- specific demo tutors (Landing.tsx featured cards link to /tutor/<id> by
-- demo id).

-- demo-rivera tutor user + profile
INSERT INTO public.users (id, email, name, "createdAt", "updatedAt")
VALUES (
    '11111111-1111-1111-1111-111111111101',
    'maya.rivera@demo.chalk',
    'Dr. Maya Rivera',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tutor_profiles (
    id, user_id, display_name, headline, bio,
    hourly_rate, subject, subjects, languages,
    rating_average, rating_count, session_count,
    status, verified, avatar_url, created_at, updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'Dr. Maya Rivera',
    'PhD physics. Builds intuition from first principles.',
    'Hi, I''m Maya. I''ve taught physics and calculus for nine years — to high schoolers, undergrads, and the occasional career switcher. Sessions are paced to your goals: AP/IB exam crunch, conceptual remediation, or research-style problem solving. I''ll send you a small worked-example pack after each session so the ideas stick.',
    95,
    'Physics',
    '["Physics", "Calculus", "AP Physics C", "IB Physics HL", "Linear algebra"]'::jsonb,
    '["English", "Spanish"]'::jsonb,
    4.95, 312, 1284,
    'active', true,
    'https://i.pravatar.cc/288?u=demo-rivera',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- demo-okafor tutor user + profile
INSERT INTO public.users (id, email, name, "createdAt", "updatedAt")
VALUES (
    '11111111-1111-1111-1111-111111111102',
    'adaeze.okafor@demo.chalk',
    'Adaeze Okafor',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tutor_profiles (
    id, user_id, display_name, headline, bio,
    hourly_rate, subject, subjects, languages,
    rating_average, rating_count, session_count,
    status, verified, avatar_url, created_at, updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    'Adaeze Okafor',
    'Bilingual writing coach for IELTS, TOEFL & college essays.',
    'I help students write essays that admissions readers actually want to read — focused, specific, with a real voice. I''ve coached IELTS and TOEFL test-takers to top-band scores, and shepherded over 200 college essays through Common App. Expect a workout: I read closely and ask hard questions.',
    60,
    'English',
    '["English", "IELTS", "TOEFL", "Essay coaching"]'::jsonb,
    '["English", "Igbo", "French"]'::jsonb,
    4.88, 184, 612,
    'active', true,
    'https://i.pravatar.cc/288?u=demo-okafor',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- demo-tanaka tutor user + profile
INSERT INTO public.users (id, email, name, "createdAt", "updatedAt")
VALUES (
    '11111111-1111-1111-1111-111111111103',
    'kenji.tanaka@demo.chalk',
    'Kenji Tanaka',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tutor_profiles (
    id, user_id, display_name, headline, bio,
    hourly_rate, subject, subjects, languages,
    rating_average, rating_count, session_count,
    status, verified, avatar_url, created_at, updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Kenji Tanaka',
    'Software engineer turned tutor — Python, algorithms, ML.',
    'Twelve years writing software at scale, now spending half my week teaching. I''m at my best with motivated learners working through CS fundamentals, intermediate Python, or breaking into ML. We''ll write code together, not just talk about it.',
    110,
    'Python',
    '["Python", "Algorithms", "Machine learning", "Data structures"]'::jsonb,
    '["English", "Japanese"]'::jsonb,
    4.92, 247, 893,
    'active', true,
    'https://i.pravatar.cc/288?u=demo-tanaka',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sample availability slots for each demo tutor (Mon = 1 ... Sun = 0)
INSERT INTO public.availability_slots (id, tutor_id, user_id, day_of_week, start_time, end_time, recurring, created_at)
VALUES
    ('33333333-3333-3333-3333-333333333101', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 1, '09:00', '12:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333102', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 1, '14:00', '17:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333103', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 2, '10:00', '13:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333104', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 4, '08:00', '12:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333105', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 4, '15:00', '19:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333106', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 5, '13:00', '17:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333107', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 6, '10:00', '15:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333201', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 2, '11:00', '15:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333202', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 3, '09:00', '13:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333203', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 5, '14:00', '18:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 1, '17:00', '21:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 3, '17:00', '21:00', true, NOW()),
    ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 6, '10:00', '15:00', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- A few demo students whose reviews show on tutor profiles. These users
-- exist only to populate the reviews — they have no auth credentials.
INSERT INTO public.users (id, email, name, "createdAt", "updatedAt")
VALUES
    ('11111111-1111-1111-1111-111111111201', 'priya.patel@demo.chalk', 'Priya Patel', NOW(), NOW()),
    ('11111111-1111-1111-1111-111111111202', 'tomas.leon@demo.chalk', 'Tomás León', NOW(), NOW()),
    ('11111111-1111-1111-1111-111111111203', 'hana.suzuki@demo.chalk', 'Hana Suzuki', NOW(), NOW()),
    ('11111111-1111-1111-1111-111111111204', 'marcus.kim@demo.chalk', 'Marcus Kim', NOW(), NOW()),
    ('11111111-1111-1111-1111-111111111205', 'eunji.lee@demo.chalk', 'Eun-Ji Lee', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Reviews for demo-rivera
INSERT INTO public.reviews (id, reviewer_id, tutor_id, rating, body, created_at, updated_at)
VALUES
    ('44444444-4444-4444-4444-444444444101', '11111111-1111-1111-1111-111111111201', '22222222-2222-2222-2222-222222222201', 5, 'Patient and clear. Made calc concepts feel intuitive — SAT math jumped 110 points after six sessions.', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
    ('44444444-4444-4444-4444-444444444102', '11111111-1111-1111-1111-111111111202', '22222222-2222-2222-2222-222222222201', 5, 'Best physics tutor I''ve had. Worked through IB HL paper-3 with me until I felt rock-solid.', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days'),
    ('44444444-4444-4444-4444-444444444103', '11111111-1111-1111-1111-111111111203', '22222222-2222-2222-2222-222222222201', 4, 'Very thorough. Lots of homework between sessions — but worth it.', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
    ('44444444-4444-4444-4444-444444444201', '11111111-1111-1111-1111-111111111204', '22222222-2222-2222-2222-222222222202', 5, 'Adaeze gave my Common App essay a personality I didn''t know I had.', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
    ('44444444-4444-4444-4444-444444444202', '11111111-1111-1111-1111-111111111201', '22222222-2222-2222-2222-222222222202', 5, 'Hit a 7.5 on IELTS writing in two months of weekly sessions. Worth every dollar.', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
    ('44444444-4444-4444-4444-444444444301', '11111111-1111-1111-1111-111111111205', '22222222-2222-2222-2222-222222222203', 5, 'Kenji explains data structures like a pro. Shipped my first graph algorithm after two sessions.', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
    ('44444444-4444-4444-4444-444444444302', '11111111-1111-1111-1111-111111111202', '22222222-2222-2222-2222-222222222203', 5, 'Career-switcher here. Kenji rebuilt my fundamentals — tight feedback loop, real code review every session.', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days')
ON CONFLICT (id) DO NOTHING;

-- Sample subjects (for /api/subjects taxonomy)
INSERT INTO public.subjects (id, name, slug, parent_slug, sort_order, created_at)
VALUES
    ('55555555-5555-5555-5555-555555555101', 'Mathematics', 'math', NULL, 10, NOW()),
    ('55555555-5555-5555-5555-555555555102', 'Calculus',     'calculus', 'math', 11, NOW()),
    ('55555555-5555-5555-5555-555555555103', 'Algebra',      'algebra', 'math', 12, NOW()),
    ('55555555-5555-5555-5555-555555555201', 'Science',      'science', NULL, 20, NOW()),
    ('55555555-5555-5555-5555-555555555202', 'Physics',      'physics', 'science', 21, NOW()),
    ('55555555-5555-5555-5555-555555555203', 'Chemistry',    'chemistry', 'science', 22, NOW()),
    ('55555555-5555-5555-5555-555555555301', 'Languages',    'languages', NULL, 30, NOW()),
    ('55555555-5555-5555-5555-555555555302', 'English',      'english', 'languages', 31, NOW()),
    ('55555555-5555-5555-5555-555555555303', 'Spanish',      'spanish', 'languages', 32, NOW()),
    ('55555555-5555-5555-5555-555555555401', 'Test prep',    'test-prep', NULL, 40, NOW()),
    ('55555555-5555-5555-5555-555555555402', 'IELTS',        'ielts', 'test-prep', 41, NOW()),
    ('55555555-5555-5555-5555-555555555403', 'TOEFL',        'toefl', 'test-prep', 42, NOW()),
    ('55555555-5555-5555-5555-555555555501', 'Coding',       'coding', NULL, 50, NOW()),
    ('55555555-5555-5555-5555-555555555502', 'Python',       'python', 'coding', 51, NOW()),
    ('55555555-5555-5555-5555-555555555503', 'Algorithms',   'algorithms', 'coding', 52, NOW()),
    ('55555555-5555-5555-5555-555555555601', 'Music',        'music', NULL, 60, NOW())
ON CONFLICT (id) DO NOTHING;
