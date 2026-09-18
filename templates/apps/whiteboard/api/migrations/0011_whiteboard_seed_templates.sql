-- whiteboard: seed the system templates that the /templates page offers
-- as starting points for a fresh user. Only insert when no system rows
-- already exist so this migration is idempotent / replayable.
--
-- All system rows have owner_id = NULL, user_id = NULL, is_system = true.
-- The handler filters system templates via `is_system = true` and they
-- are listable / instantiate-able by any authed user, but never deletable.
INSERT INTO public.board_templates
    (id, owner_id, user_id, name, description, snapshot, is_system, created_at, updated_at)
SELECT * FROM (VALUES
    (
        gen_random_uuid(),
        NULL::uuid,
        NULL::uuid,
        'Retrospective'::text,
        'Three-column retro board: What went well, What didn''t, What to try next.'::text,
        '{"elements":[{"type":"sticky","x":40,"y":40,"width":220,"height":80,"content":{"text":"What went well","color":"#bbf7d0"}},{"type":"sticky","x":300,"y":40,"width":220,"height":80,"content":{"text":"What didn''t","color":"#fecaca"}},{"type":"sticky","x":560,"y":40,"width":220,"height":80,"content":{"text":"What to try next","color":"#bfdbfe"}}]}'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        NULL::uuid,
        'Kanban board'::text,
        'Backlog / In progress / Done lanes for lightweight task tracking.'::text,
        '{"elements":[{"type":"sticky","x":40,"y":40,"width":220,"height":80,"content":{"text":"Backlog","color":"#e5e7eb"}},{"type":"sticky","x":300,"y":40,"width":220,"height":80,"content":{"text":"In progress","color":"#fef08a"}},{"type":"sticky","x":560,"y":40,"width":220,"height":80,"content":{"text":"Done","color":"#bbf7d0"}}]}'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        NULL::uuid,
        'Brainstorm'::text,
        'Open canvas with a single prompt sticky in the centre — add ideas around it.'::text,
        '{"elements":[{"type":"sticky","x":300,"y":200,"width":260,"height":120,"content":{"text":"What problem are we trying to solve?","color":"#fef08a"}}]}'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        NULL::uuid,
        'User journey map'::text,
        'Awareness → Consideration → Decision → Retention stages for mapping a user flow.'::text,
        '{"elements":[{"type":"sticky","x":40,"y":40,"width":200,"height":80,"content":{"text":"Awareness","color":"#bfdbfe"}},{"type":"sticky","x":260,"y":40,"width":200,"height":80,"content":{"text":"Consideration","color":"#c7d2fe"}},{"type":"sticky","x":480,"y":40,"width":200,"height":80,"content":{"text":"Decision","color":"#ddd6fe"}},{"type":"sticky","x":700,"y":40,"width":200,"height":80,"content":{"text":"Retention","color":"#bbf7d0"}}]}'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        NULL::uuid,
        'SWOT analysis'::text,
        'Strengths / Weaknesses / Opportunities / Threats — four-quadrant strategy canvas.'::text,
        '{"elements":[{"type":"sticky","x":40,"y":40,"width":260,"height":120,"content":{"text":"Strengths","color":"#bbf7d0"}},{"type":"sticky","x":340,"y":40,"width":260,"height":120,"content":{"text":"Weaknesses","color":"#fecaca"}},{"type":"sticky","x":40,"y":200,"width":260,"height":120,"content":{"text":"Opportunities","color":"#bfdbfe"}},{"type":"sticky","x":340,"y":200,"width":260,"height":120,"content":{"text":"Threats","color":"#fed7aa"}}]}'::jsonb,
        true,
        now(),
        now()
    )
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM public.board_templates WHERE is_system = true
);
