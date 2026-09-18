-- video-editor: seed a small starter library of project templates so the
-- Templates page renders something on a fresh install without requiring
-- an admin import flow.

INSERT INTO templates (name, description, category, project_snapshot, cover_image_url, is_premium)
VALUES
  ('Lower Third', 'Animated name-and-title overlay for talking-head clips.', 'overlay',
   '{"width":1920,"height":1080,"fps":30,"tracks":[{"name":"Title","type":"text","position":0}]}'::jsonb,
   NULL, false),
  ('Title Card', 'Centered intro title with fade-in and clean serif type.', 'intro',
   '{"width":1920,"height":1080,"fps":30,"tracks":[{"name":"Title","type":"text","position":0}]}'::jsonb,
   NULL, false),
  ('Instagram Reel', 'Vertical 9:16 short with snappy cuts and beat sync.', 'social',
   '{"width":1080,"height":1920,"fps":30,"tracks":[{"name":"Video","type":"video","position":0},{"name":"Audio","type":"audio","position":1}]}'::jsonb,
   NULL, false),
  ('YouTube Intro', 'Punchy 5-second logo reveal with sound design.', 'intro',
   '{"width":1920,"height":1080,"fps":60,"tracks":[{"name":"Logo","type":"video","position":0},{"name":"Sound","type":"audio","position":1}]}'::jsonb,
   NULL, true)
ON CONFLICT DO NOTHING;
