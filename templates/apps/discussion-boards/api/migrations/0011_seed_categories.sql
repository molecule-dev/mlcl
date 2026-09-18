-- Seed default discussion categories so a fresh install has real
-- communities to browse from the moment the first user signs up.
-- Idempotent via slug-based ON CONFLICT — re-running is a no-op.
--
-- These categories mirror the Stoa design intent (philosophy / product
-- craft / community / craft-reviews / announcements / archive). Real
-- topics still need to be authored through the UI; this just makes
-- the rooms exist so users land in a populated dashboard.
INSERT INTO public.categories (slug, name, description, color, icon, sort_order, thread_count, created_at, updated_at)
VALUES
  ('philosophy',     'Philosophy & Ethics',  'Long-running threads on the examined life — Stoicism, virtue ethics, applied logic.', '#5b4fc7', 'menu_book',       1, 0, now(), now()),
  ('product-craft',  'Product Craft',        'Working on something? Share, critique, learn. PRDs, post-mortems, design reviews.',  '#e09a2e', 'design_services', 2, 0, now(), now()),
  ('community',      'Community Hall',       'Introductions, weekly threads, town halls. Lower-stakes, higher-warmth conversations.', '#16a34a', 'forum',         3, 0, now(), now()),
  ('craft-reviews',  'Craft Reviews',        'Volunteer-staffed peer review. Share a piece of work, get back a serious read in 48 hours.', '#0891b2', 'reviews',    4, 0, now(), now()),
  ('announcements',  'Announcements',        'Read-only space for site updates, governance changes, and community news.',         '#9333ea', 'campaign',        5, 0, now(), now()),
  ('archive',        'The Archive',          'Historic threads we keep around for reference. Locked but readable.',               '#6b7280', 'inventory_2',     6, 0, now(), now())
ON CONFLICT (slug) DO NOTHING;
