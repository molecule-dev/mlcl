-- spreadsheet: seed the system templates that the Templates page offers
-- as starting points. Only insert if no system rows exist so this
-- migration is replayable without overwriting or duplicating.
-- All system rows have owner_id = NULL and is_system = true.
INSERT INTO public.spreadsheet_templates
    (id, owner_id, name, description, category, is_system, snapshot, created_at, updated_at)
SELECT * FROM (VALUES
    (
        gen_random_uuid(),
        NULL::uuid,
        'Sales pipeline'::text,
        'Track deals across stages with owner, value, and close-by date.'::text,
        'finance'::text,
        true,
        '{"sheets":[{"name":"Pipeline","position":0,"columns":[{"name":"Account","type":"text","position":0,"width_px":200},{"name":"Stage","type":"single_select","position":1,"width_px":140,"config":{"options":["Lead","Qualified","Proposal","Closed Won","Closed Lost"]}},{"name":"Owner","type":"text","position":2,"width_px":160},{"name":"Value","type":"number","position":3,"width_px":120},{"name":"Close by","type":"date","position":4,"width_px":140}],"rows":[{"position":0,"cells":{}},{"position":1,"cells":{}},{"position":2,"cells":{}}]}]}'::jsonb,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Project tasks'::text,
        'Lightweight task tracker with owner, status, and due date.'::text,
        'ops'::text,
        true,
        '{"sheets":[{"name":"Tasks","position":0,"columns":[{"name":"Title","type":"text","position":0,"width_px":260},{"name":"Status","type":"single_select","position":1,"width_px":140,"config":{"options":["Backlog","In progress","In review","Done"]}},{"name":"Owner","type":"text","position":2,"width_px":160},{"name":"Priority","type":"single_select","position":3,"width_px":120,"config":{"options":["Low","Medium","High"]}},{"name":"Due","type":"date","position":4,"width_px":140}],"rows":[{"position":0,"cells":{}},{"position":1,"cells":{}},{"position":2,"cells":{}}]}]}'::jsonb,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Headcount planner'::text,
        'Plan hires by team, role, level, and quarter.'::text,
        'people'::text,
        true,
        '{"sheets":[{"name":"Hires","position":0,"columns":[{"name":"Role","type":"text","position":0,"width_px":220},{"name":"Team","type":"single_select","position":1,"width_px":140,"config":{"options":["Engineering","Product","Design","Sales","Ops"]}},{"name":"Level","type":"single_select","position":2,"width_px":120,"config":{"options":["IC1","IC2","IC3","IC4","Manager","Director"]}},{"name":"Status","type":"single_select","position":3,"width_px":140,"config":{"options":["Open","Sourcing","Onsite","Offer","Hired"]}},{"name":"Quarter","type":"text","position":4,"width_px":120}],"rows":[{"position":0,"cells":{}},{"position":1,"cells":{}}]}]}'::jsonb,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Product roadmap'::text,
        'Quarter-by-quarter feature roadmap with theme, status, and confidence.'::text,
        'product'::text,
        true,
        '{"sheets":[{"name":"Roadmap","position":0,"columns":[{"name":"Feature","type":"text","position":0,"width_px":240},{"name":"Theme","type":"text","position":1,"width_px":160},{"name":"Quarter","type":"single_select","position":2,"width_px":120,"config":{"options":["Q1","Q2","Q3","Q4"]}},{"name":"Status","type":"single_select","position":3,"width_px":140,"config":{"options":["Idea","Planned","Building","Shipping","Shipped"]}},{"name":"Confidence","type":"single_select","position":4,"width_px":120,"config":{"options":["Low","Medium","High"]}}],"rows":[{"position":0,"cells":{}},{"position":1,"cells":{}},{"position":2,"cells":{}}]}]}'::jsonb,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Marketing calendar'::text,
        'Plan content and campaigns by channel, owner, and publish date.'::text,
        'marketing'::text,
        true,
        '{"sheets":[{"name":"Campaigns","position":0,"columns":[{"name":"Title","type":"text","position":0,"width_px":240},{"name":"Channel","type":"single_select","position":1,"width_px":140,"config":{"options":["Blog","Email","Social","Webinar","PR"]}},{"name":"Owner","type":"text","position":2,"width_px":160},{"name":"Status","type":"single_select","position":3,"width_px":140,"config":{"options":["Idea","Drafted","Approved","Live"]}},{"name":"Publish","type":"date","position":4,"width_px":140}],"rows":[{"position":0,"cells":{}},{"position":1,"cells":{}}]}]}'::jsonb,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Expense tracker'::text,
        'Personal or team expense log with category, amount, and reimbursement status.'::text,
        'finance'::text,
        true,
        '{"sheets":[{"name":"Expenses","position":0,"columns":[{"name":"Date","type":"date","position":0,"width_px":140},{"name":"Description","type":"text","position":1,"width_px":260},{"name":"Category","type":"single_select","position":2,"width_px":140,"config":{"options":["Travel","Meals","Software","Hardware","Other"]}},{"name":"Amount","type":"number","position":3,"width_px":120},{"name":"Reimbursed","type":"single_select","position":4,"width_px":140,"config":{"options":["No","Submitted","Approved","Paid"]}}],"rows":[{"position":0,"cells":{}},{"position":1,"cells":{}}]}]}'::jsonb,
        now(),
        now()
    )
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM public.spreadsheet_templates WHERE is_system = true
);
