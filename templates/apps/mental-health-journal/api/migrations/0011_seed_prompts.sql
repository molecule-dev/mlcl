-- Seed canonical prompt library for the Lucid mental-health-journal app.
-- Idempotent: all rows use ON CONFLICT (slug) DO NOTHING so re-runs are
-- safe even after the initial seed. Categories match the front-end's
-- CATEGORY_META set in app/src/pages/Prompts.tsx.

INSERT INTO public.prompts (slug, category, body_template, is_active, locale) VALUES
  ('gratitude-small-thing',     'gratitude',  'What is one small thing you are grateful for today?',                                  true, 'en'),
  ('gratitude-witness',         'gratitude',  'Recall a small joy from this week. Describe it in detail.',                            true, 'en'),
  ('gratitude-warmth',          'gratitude',  'Whose warmth helped you feel more like yourself today?',                               true, 'en'),
  ('feeling-present',           'feeling',    'Describe a moment today when you felt fully present.',                                 true, 'en'),
  ('feeling-body',              'feeling',    'Where in your body do you feel today''s mood?',                                        true, 'en'),
  ('feeling-honest',            'feeling',    'How are you feeling — really?',                                                        true, 'en'),
  ('kindness-witness',          'kindness',   'Where did you witness kindness — yours or someone else''s?',                           true, 'en'),
  ('kindness-boundary',         'kindness',   'What is one boundary you are proud of holding lately?',                                true, 'en'),
  ('kindness-self',             'kindness',   'What is one kind thing you can do for yourself this week?',                            true, 'en'),
  ('learn-self',                'learn',      'What is something you are learning about yourself this season?',                       true, 'en'),
  ('learn-surprise',            'learn',      'What did you do today that surprised you?',                                            true, 'en'),
  ('learn-pattern',             'learn',      'What pattern have you noticed in your reactions this month?',                          true, 'en'),
  ('release-sleep',             'release',    'What can you let go of, gently, before sleep?',                                        true, 'en'),
  ('release-future',            'release',    'What does your future self most want you to remember from this moment?',               true, 'en'),
  ('release-weight',            'release',    'What weight are you ready to set down — even briefly?',                                true, 'en'),
  ('connection-missing',        'connection', 'Who are you missing today, and what would you tell them?',                             true, 'en'),
  ('connection-only-journal',   'connection', 'What is something you would say only to your journal?',                                true, 'en'),
  ('connection-reach-out',      'connection', 'Who would you like to reach out to this week — and what holds you back?',              true, 'en')
ON CONFLICT (slug) DO NOTHING;
