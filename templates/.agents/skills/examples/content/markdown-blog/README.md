---
name: markdown-blog
intent: |
  - "I want to write articles"
  - "A blog"
  - "Newsletter / posts"
  - "Articles section"
  - "Documentation site for my product"
keywords: [blog, post, article, content, markdown, writing, news]
---

# Markdown blog (write posts → render with markdown)

**When to copy this example:** the user wants any place where they
(or their team) write long-form content and visitors read it.
Newsletter posts, product changelogs, support docs — same shape.

## What you'll install

```bash
cd /workspace
# The posts handler uses @molecule/api-database directly — no extra API package needed.
# Wire the database bond in api/bonds.ts (e.g. @molecule/api-database-postgresql).
npm install @molecule/app-markdown --workspace=app                   # markdown core interface
npm install @molecule/app-markdown-react-markdown --workspace=app    # react-markdown provider (XSS-safe)
```

## Files in this example

| Path                                 | What it does                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `api/handlers/posts.ts`              | CRUD for blog posts. Listed posts paginated, drafts hidden from public.                       |
| `app/pages/BlogIndexPage.tsx`        | Public list of published posts as padded cards (title + excerpt + date).                      |
| `app/pages/PostPage.tsx`             | Single-post view, renders markdown to sanitized HTML via `requireProvider().render()`.        |
| `app/pages/admin/PostEditorPage.tsx` | Author-only editor — title, slug, body markdown, draft toggle.                                |
| `app/components/AnnotatedProse.tsx`  | Inline AI-span highlight with its prompt/model on hover — the geometry that stays readable.   |
| `app/components/AnnotatedBody.tsx`   | Two-column reading layout: paragraphs left, summary-then-annotation right, stacking on phone. |

## The reading layout (annotations + summaries beside the text)

When a post carries AI annotations and per-section summaries, do NOT
interleave them into the prose. Use `AnnotatedBody`'s shape:

- Two columns from `md` up: prose (`1fr`) and a side column (`20rem`),
  `items-start` so each side block tops-aligns with ITS paragraph (or the
  paragraph group it covers — one summary may legitimately cover several
  paragraphs). Summary first, annotation second, inside the side block.
- A TL;DR is ONE SHORT SENTENCE (≤ ~25 words): the reader skims the
  section's point without reading the paragraph — a summary nearly as long
  as the section defeats its own purpose. Ask for exactly this in the
  summarizer's prompt, and enforce it by keeping the model's first complete
  sentence (or asking again) — never by cutting at a character count and
  appending a full stop; "…preserving the session and pairing each." is a
  visible failure.
- The prompt shown beside a paragraph is the person's words only, as
  typed: strip the export's separators (`---`), role markers, timestamps
  and tool noise before display.
- The two columns sit TOGETHER: the side column begins within ~4rem of the
  prose column's right edge and the pair is centred as one unit — never
  prose flush left and a gutter flush right with a void between them.
- A short paragraph gets NO summary — omit the block rather than padding.
  Summarise only a section with real prose (about 80+ words outside code:
  a long paragraph, or several). A one-line cheatsheet entry, a command
  with a sentence under it, or an all-code section gets no TL;DR at all —
  a summary longer than the text it stands for is noise.
- BOTH toggles default ON, ordered summaries-FIRST then annotations, on
  one row that never wraps. Each is a switch that LOOKS like a switch: a
  visible track (a pill about 44×24px whose fill changes with the state),
  a round knob that slides end to end, the label beside the track — never
  a bare word, never two labels overlapping.
- A post with nothing for the side column (no summary over the threshold,
  no prompt — a cheatsheet, a short human note) renders NO side column at
  all: the prose takes the full measure, centred, and there are no toggles.
  An empty gutter pushing the content left is the failure to avoid.
- Sections are separated by space (the heading's margin), never by rules:
  no border or divider under a section.
- The index's article list is width-limited to the SAME measure as the
  post body — one reading width for list and article, never a full-width
  list beside a measured post.
- At phone width the columns collapse: the side block stacks directly
  beneath its paragraph, visually secondary (left accent edge, smaller
  type). The site nav collapses behind a single ≥44px menu button (a
  hamburger) instead of sharing the header row with the brand, and the
  header's site-name never wraps. Nothing overflows 375px; tap targets
  stay ≥44px as a HIT AREA — expand the invisible hit area around
  compact controls (::before inset) rather than making pills visually
  tall.

## Anti-patterns

- Do not render user-supplied markdown with `dangerouslySetInnerHTML` on a
  hand-rolled parser. Use `requireProvider().render()` from
  `@molecule/app-markdown` — the bonded provider (`@molecule/app-markdown-react-markdown`)
  sanitises XSS before returning `html`.
- Do not invent `@molecule/app-blog` or `@molecule/api-cms`.
  A blog is `api-resource-content` (or a custom `posts` table) plus
  `@molecule/app-markdown` plus your routing.
- Do not store the rendered HTML in the database — store the markdown
  source. Render at read time so escaping logic stays consistent.
- Do not skip a slug field. Routing `/posts/123` is worse SEO than
  `/posts/why-we-chose-postgres`.

## Verify

Sign in as the author → write a post → save as draft → preview →
publish → visit `/blog` as a logged-out visitor → post appears.
