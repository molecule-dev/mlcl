---
name: wiki-kb
intent: |
  - "Wiki"
  - "Knowledge base"
  - "Internal docs"
  - "Confluence clone"
  - "Public docs site"
  - "Notion-style team docs"
keywords: [wiki, kb, knowledge-base, docs, confluence, notion, internal]
---

# Wiki / knowledge base (compound — multi-feature roadmap)

**This isn't a single example.** A wiki composes auth + content

- search + version history + (optionally) multi-tenancy.

## Build order

1. **`auth/email-password-login/`** + **`auth/role-based-access/`**
   — viewer / editor / admin.
2. **`content/markdown-blog/`** — adapt for wiki pages. Replace the
   `slug` semantics with hierarchical paths (`/engineering/onboarding/checklist`).
3. **`search/full-text-search/`** — table-stakes. Without it, a
   knowledge base is unusable.
4. **`forms/version-history/`** — every page edit creates a revision.
5. **`compound/multi-tenant-orgs/`** — only if multiple teams /
   companies share the install (Notion-style multi-workspace).

## What you'll build on top

Custom code with no example coverage:

- **`pages` table** with `parent_id` for tree structure + `path`
  for canonical URL routing.
- **Markdown renderer** — use `@molecule/app-markdown` +
  `@molecule/app-markdown-react-markdown` (the `content/markdown-blog/` slice
  already wires them); it gives you rendering + a `TocEntry` heading tree for
  anchor links. Do NOT hand-roll a renderer. The only custom bit is resolving
  `[[Page Name]]` internal links (a small pre-transform of the source).
- **Sidebar tree component**: collapsible per-section, current
  page highlighted.
- **Permissions per page** (optional advanced feature): override
  org-level RBAC for sensitive sections.

## Anti-patterns

- Do not invent `@molecule/app-wiki` or `@molecule/api-confluence`.
  Composition.
- Do not store rendered HTML; store the markdown source. Render
  at read time so search indexes the actual text and i18n works
  later.
- Do not skip soft-delete on pages. People accidentally delete
  important docs.
- Do not require auth to view a public KB. Public-by-default with
  optional gating per page is far more useful than the inverse.

## Verify

Editor logs in → creates "Engineering" section → adds "Onboarding"
page with markdown → publishes → viewer (logged out, public) can
read at `/engineering/onboarding` → editor edits → revision
created → search "onboarding" finds the page → restoring v1
creates v3.
