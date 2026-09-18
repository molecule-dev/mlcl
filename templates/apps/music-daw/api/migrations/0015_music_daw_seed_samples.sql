-- music-daw: seed the shared sample library. NULL user_id signals
-- "library" rows readable by every authenticated user (mirrors the
-- approach used for built-in instruments in 0012). The IDs are stable
-- so flagship screenshots and e2e tests can reference them.

INSERT INTO samples (id, user_id, name, url, bpm, music_key, length_sec, tags, is_public, pack, category, cover_index, is_loop)
VALUES
  ('11111111-0000-0000-0000-000000000001', NULL, 'Sub Pulse 124',        '/library/samples/sub-pulse-124.wav',        124, 'A min',  8,    '["bass","loop"]'::jsonb,  TRUE, 'Neon Bass Pack',     'bass',  0, TRUE),
  ('11111111-0000-0000-0000-000000000002', NULL, 'Tape Crackle Atmos',   '/library/samples/tape-crackle-atmos.wav',   NULL, NULL,    32,   '["fx","texture"]'::jsonb, TRUE, 'Field Recordings',   'fx',    2, FALSE),
  ('11111111-0000-0000-0000-000000000003', NULL, 'Vocal Hook — Aria',    '/library/samples/vocal-hook-aria.wav',      92,  'F# maj', 12,   '["vocal","loop"]'::jsonb, TRUE, 'Soul Sessions',      'vocal', 5, TRUE),
  ('11111111-0000-0000-0000-000000000004', NULL, 'Trap Hat Roll 8th',    '/library/samples/trap-hat-roll-8th.wav',    140, NULL,    4,    '["drums","loop"]'::jsonb, TRUE, '808 Foundations',    'drums', 1, TRUE),
  ('11111111-0000-0000-0000-000000000005', NULL, 'Pluck Synth Stab',     '/library/samples/pluck-synth-stab.wav',     110, 'C min',  2,    '["synth","one-shot"]'::jsonb, TRUE, 'Modular Mornings',   'synth', 3, FALSE),
  ('11111111-0000-0000-0000-000000000006', NULL, 'Reverse Cymbal Swell', '/library/samples/reverse-cymbal-swell.wav', NULL, NULL,    6,    '["fx"]'::jsonb,           TRUE, 'Cinematic Risers',   'fx',    4, FALSE),
  ('11111111-0000-0000-0000-000000000007', NULL, 'Granular Choir Pad',   '/library/samples/granular-choir-pad.wav',   70,  'D min',  24,   '["synth","loop"]'::jsonb, TRUE, 'Choral Reverie',     'synth', 5, TRUE),
  ('11111111-0000-0000-0000-000000000008', NULL, '808 Boom — F1',        '/library/samples/808-boom-f1.wav',          NULL, 'F1',    3,    '["bass","one-shot"]'::jsonb, TRUE, '808 Foundations',  'bass',  0, FALSE),
  ('11111111-0000-0000-0000-000000000009', NULL, 'Snap — Wet Room',      '/library/samples/snap-wet-room.wav',        NULL, NULL,    1,    '["drums","one-shot"]'::jsonb, TRUE, 'Hand Claps',       'drums', 1, FALSE),
  ('11111111-0000-0000-0000-00000000000a', NULL, 'Saw Lead — Bright',    '/library/samples/saw-lead-bright.wav',      128, 'G maj',  16,   '["synth","loop"]'::jsonb, TRUE, 'Modular Mornings',   'synth', 3, TRUE),
  ('11111111-0000-0000-0000-00000000000b', NULL, 'Vocal Whisper Layer',  '/library/samples/vocal-whisper-layer.wav',  NULL, NULL,    8,    '["vocal","texture"]'::jsonb, TRUE, 'Soul Sessions',     'vocal', 5, FALSE),
  ('11111111-0000-0000-0000-00000000000c', NULL, 'Conga Loop — 110',     '/library/samples/conga-loop-110.wav',       110, NULL,    8,    '["drums","loop"]'::jsonb, TRUE, 'Latin Foundations',  'drums', 1, TRUE)
ON CONFLICT (id) DO NOTHING;
