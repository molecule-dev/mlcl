-- ai-writing-studio: seed the system templates that the Templates page
-- offers as starting points. Only insert if the table is empty so this
-- migration is replayable without risking overwrites or duplicates.
-- All system rows have user_id = NULL and is_system = true.
INSERT INTO public.document_templates
    (id, user_id, name, description, category, body_template, placeholder_vars, is_system, created_at, updated_at)
SELECT * FROM (VALUES
    (
        gen_random_uuid(),
        NULL::uuid,
        'Newsletter issue'::text,
        'Long-form personal-essay newsletter with one big idea, three supporting sections, and a sign-off.'::text,
        'newsletter'::text,
        E'# {{title}}\n\n*Issue {{issueNumber}} · {{date}}*\n\n## The big idea\n\n{{intro}}\n\n## Why it matters\n\n- ...\n- ...\n- ...\n\n## What I read this week\n\n1. ...\n2. ...\n3. ...\n\n## Next time\n\n{{closing}}\n\n— {{authorName}}'::text,
        '["title","issueNumber","date","intro","closing","authorName"]'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Personal essay'::text,
        'Reflective essay structured as hook → tension → turn → resolution. 800–1500 words.'::text,
        'essay'::text,
        E'# {{title}}\n\n## The hook\n\n{{opening}}\n\n## The tension\n\n_What is at stake?_\n\n## The turn\n\n_What changed your mind?_\n\n## The resolution\n\n{{takeaway}}'::text,
        '["title","opening","takeaway"]'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Blog post'::text,
        'Standard editorial blog post: lede, body sections, takeaway. SEO-friendly headings.'::text,
        'general'::text,
        E'# {{title}}\n\n*{{lede}}*\n\n## What you will learn\n\n- ...\n- ...\n- ...\n\n## Section one\n\n...\n\n## Section two\n\n...\n\n## Section three\n\n...\n\n## Takeaway\n\n{{takeaway}}'::text,
        '["title","lede","takeaway"]'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Product launch announcement'::text,
        'Marketing post that introduces a new product with hero claim, three benefit pillars, and a call to action.'::text,
        'marketing'::text,
        E'# Introducing {{productName}}\n\n**{{tagline}}**\n\n## Why we built it\n\n{{problem}}\n\n## What it does\n\n- {{benefit1}}\n- {{benefit2}}\n- {{benefit3}}\n\n## How to get started\n\n{{cta}}'::text,
        '["productName","tagline","problem","benefit1","benefit2","benefit3","cta"]'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Book review'::text,
        'Book review with rating, plot summary, author voice, and recommendation.'::text,
        'review'::text,
        E'# {{bookTitle}} — review\n\n*{{rating}} · by {{author}}*\n\n## Premise\n\n{{premise}}\n\n## What works\n\n...\n\n## What did not\n\n...\n\n## Verdict\n\n{{verdict}}'::text,
        '["bookTitle","rating","author","premise","verdict"]'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Interview piece'::text,
        'Long-form Q&A interview with intro, three themed question blocks, and outro.'::text,
        'interview'::text,
        E'# In conversation with {{guestName}}\n\n*{{outletName}} · {{date}}*\n\n{{intro}}\n\n## On their work\n\n**Q:**\n**A:**\n\n## On their craft\n\n**Q:**\n**A:**\n\n## On what comes next\n\n**Q:**\n**A:**\n\n*{{guestName}} is {{bio}}.*'::text,
        '["guestName","outletName","date","intro","bio"]'::jsonb,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        NULL::uuid,
        'Changelog entry'::text,
        'Crisp changelog post listing what shipped, what was fixed, and what is next.'::text,
        'changelog'::text,
        E'# {{version}} — {{date}}\n\n## ✨ Added\n\n- ...\n- ...\n\n## 🛠 Fixed\n\n- ...\n\n## 🔭 Coming next\n\n- ...'::text,
        '["version","date"]'::jsonb,
        true,
        now(),
        now()
    )
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM public.document_templates WHERE is_system = true
);
