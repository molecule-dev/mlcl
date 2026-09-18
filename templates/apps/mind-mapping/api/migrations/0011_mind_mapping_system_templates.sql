-- Seeds a small library of built-in `map_templates` so the
-- /templates page is non-empty on first boot and "Use this template"
-- on TemplateDetail produces a real, runnable map. Each template's
-- snapshot follows the same shape the runtime emits at /versions snapshot
-- time: { nodes: [...], connections: [...] } where node positions are
-- pre-laid-out so the new map renders well immediately.
--
-- Idempotent: each row matches on a deterministic uuid so re-running the
-- migration is a no-op.

INSERT INTO public.map_templates (id, owner_id, name, description, snapshot, is_system, created_at)
VALUES (
  '00000000-0000-4000-a000-00000000a001',
  NULL,
  'SWOT analysis',
  'Strengths, weaknesses, opportunities, threats — four-quadrant strategic frame.',
  '{
    "nodes": [
      { "id": "swot-root",   "parent_id": null,        "text": "SWOT analysis",   "color": "#2563eb", "shape": "round", "size": "l", "x": 280, "y": 200, "position": 0 },
      { "id": "swot-s",      "parent_id": "swot-root", "text": "Strengths",       "color": "#10b981", "shape": "rect",  "size": "m", "x": 60,  "y": 60,  "position": 1 },
      { "id": "swot-w",      "parent_id": "swot-root", "text": "Weaknesses",      "color": "#ef4444", "shape": "rect",  "size": "m", "x": 540, "y": 60,  "position": 2 },
      { "id": "swot-o",      "parent_id": "swot-root", "text": "Opportunities",   "color": "#06b6d4", "shape": "rect",  "size": "m", "x": 60,  "y": 360, "position": 3 },
      { "id": "swot-t",      "parent_id": "swot-root", "text": "Threats",         "color": "#f59e0b", "shape": "rect",  "size": "m", "x": 540, "y": 360, "position": 4 }
    ],
    "connections": []
  }'::jsonb,
  TRUE,
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.map_templates (id, owner_id, name, description, snapshot, is_system, created_at)
VALUES (
  '00000000-0000-4000-a000-00000000a002',
  NULL,
  'Open brainstorm',
  'Single root, free branching for divergent ideation.',
  '{
    "nodes": [
      { "id": "bs-root", "parent_id": null,    "text": "Brainstorm prompt", "color": "#8b5cf6", "shape": "round", "size": "l", "x": 290, "y": 220, "position": 0 }
    ],
    "connections": []
  }'::jsonb,
  TRUE,
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.map_templates (id, owner_id, name, description, snapshot, is_system, created_at)
VALUES (
  '00000000-0000-4000-a000-00000000a003',
  NULL,
  'Customer persona',
  'Demographics, behaviors, jobs-to-be-done, pains, gains.',
  '{
    "nodes": [
      { "id": "p-root",   "parent_id": null,     "text": "Persona",        "color": "#06b6d4", "shape": "round", "size": "l", "x": 290, "y": 200, "position": 0 },
      { "id": "p-demo",   "parent_id": "p-root", "text": "Demographics",   "color": "#2563eb", "shape": "rect",  "size": "m", "x": 60,  "y": 80,  "position": 1 },
      { "id": "p-jobs",   "parent_id": "p-root", "text": "Jobs to be done","color": "#10b981", "shape": "rect",  "size": "m", "x": 540, "y": 80,  "position": 2 },
      { "id": "p-pains",  "parent_id": "p-root", "text": "Pains",          "color": "#ef4444", "shape": "rect",  "size": "m", "x": 60,  "y": 320, "position": 3 },
      { "id": "p-gains",  "parent_id": "p-root", "text": "Gains",          "color": "#f59e0b", "shape": "rect",  "size": "m", "x": 540, "y": 320, "position": 4 }
    ],
    "connections": []
  }'::jsonb,
  TRUE,
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.map_templates (id, owner_id, name, description, snapshot, is_system, created_at)
VALUES (
  '00000000-0000-4000-a000-00000000a004',
  NULL,
  'Sprint retrospective',
  'Stop / Start / Continue with branchable insights.',
  '{
    "nodes": [
      { "id": "r-root",  "parent_id": null,    "text": "Retrospective", "color": "#f59e0b", "shape": "round", "size": "l", "x": 290, "y": 200, "position": 0 },
      { "id": "r-stop",  "parent_id": "r-root", "text": "Stop",         "color": "#ef4444", "shape": "rect",  "size": "m", "x": 60,  "y": 100, "position": 1 },
      { "id": "r-start", "parent_id": "r-root", "text": "Start",        "color": "#10b981", "shape": "rect",  "size": "m", "x": 540, "y": 100, "position": 2 },
      { "id": "r-cont",  "parent_id": "r-root", "text": "Continue",     "color": "#06b6d4", "shape": "rect",  "size": "m", "x": 290, "y": 380, "position": 3 }
    ],
    "connections": []
  }'::jsonb,
  TRUE,
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.map_templates (id, owner_id, name, description, snapshot, is_system, created_at)
VALUES (
  '00000000-0000-4000-a000-00000000a005',
  NULL,
  'Customer journey',
  'Stages → touchpoints → emotions, ready to extend.',
  '{
    "nodes": [
      { "id": "j-root",  "parent_id": null,    "text": "Customer journey", "color": "#2563eb", "shape": "round", "size": "l", "x": 280, "y": 100, "position": 0 },
      { "id": "j-aware", "parent_id": "j-root", "text": "Awareness",       "color": "#8b5cf6", "shape": "rect",  "size": "m", "x": 40,  "y": 240, "position": 1 },
      { "id": "j-cons",  "parent_id": "j-root", "text": "Consideration",   "color": "#06b6d4", "shape": "rect",  "size": "m", "x": 220, "y": 320, "position": 2 },
      { "id": "j-buy",   "parent_id": "j-root", "text": "Purchase",        "color": "#10b981", "shape": "rect",  "size": "m", "x": 400, "y": 320, "position": 3 },
      { "id": "j-loyal", "parent_id": "j-root", "text": "Loyalty",         "color": "#f59e0b", "shape": "rect",  "size": "m", "x": 580, "y": 240, "position": 4 }
    ],
    "connections": []
  }'::jsonb,
  TRUE,
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.map_templates (id, owner_id, name, description, snapshot, is_system, created_at)
VALUES (
  '00000000-0000-4000-a000-00000000a006',
  NULL,
  'OKR tree',
  'Objective at the root, key results as branches.',
  '{
    "nodes": [
      { "id": "okr-obj", "parent_id": null,    "text": "Objective",   "color": "#2563eb", "shape": "round", "size": "l", "x": 280, "y": 80,  "position": 0 },
      { "id": "okr-kr1", "parent_id": "okr-obj", "text": "Key result 1", "color": "#10b981", "shape": "rect",  "size": "m", "x": 60,  "y": 240, "position": 1 },
      { "id": "okr-kr2", "parent_id": "okr-obj", "text": "Key result 2", "color": "#06b6d4", "shape": "rect",  "size": "m", "x": 280, "y": 280, "position": 2 },
      { "id": "okr-kr3", "parent_id": "okr-obj", "text": "Key result 3", "color": "#8b5cf6", "shape": "rect",  "size": "m", "x": 540, "y": 240, "position": 3 }
    ],
    "connections": []
  }'::jsonb,
  TRUE,
  now()
)
ON CONFLICT (id) DO NOTHING;
