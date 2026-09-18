-- photo-editor: seed built-in filter presets (owner_id NULL = system).
-- Idempotent — uses ON CONFLICT (id) DO NOTHING with stable UUIDs so the
-- script can re-run without duplicating rows.

INSERT INTO filter_presets (id, user_id, name, parameters)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'B&W',
    '{"saturation":0,"brightness":0,"contrast":0.1}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Warm',
    '{"temperature":15,"tint":3,"saturation":0.05}'::jsonb),
  ('00000000-0000-0000-0000-000000000003', NULL, 'Vivid',
    '{"saturation":0.4,"contrast":0.15,"vibrance":0.2}'::jsonb),
  ('00000000-0000-0000-0000-000000000004', NULL, 'Faded',
    '{"saturation":-0.2,"contrast":-0.1,"highlights":0.1,"shadows":0.05}'::jsonb),
  ('00000000-0000-0000-0000-000000000005', NULL, 'Cinematic',
    '{"saturation":-0.05,"contrast":0.2,"shadows":-0.1,"highlights":-0.05,"tint":-3}'::jsonb),
  ('00000000-0000-0000-0000-000000000006', NULL, 'Cool',
    '{"temperature":-12,"tint":-2,"saturation":-0.05}'::jsonb),
  ('00000000-0000-0000-0000-000000000007', NULL, 'Sepia',
    '{"saturation":-0.6,"temperature":18,"tint":4,"brightness":-0.05}'::jsonb)
ON CONFLICT (id) DO NOTHING;
