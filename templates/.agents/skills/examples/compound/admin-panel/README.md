---
name: admin-panel
intent: |
  - "An admin panel"
  - "Backoffice for managing my data"
  - "CMS for my own use"
  - "Internal tool to CRUD my resources"
  - "Staff dashboard"
keywords: [admin, backoffice, cms, internal, manage, crud, dashboard, staff]
---

# Admin panel (compound — multi-feature roadmap)

**This isn't a single example.** An admin panel is the composition of
auth + paginated tables + edit forms across one resource per screen.
Read this README as a build order, then read each linked example for
the actual code.

## Build order

1. **`auth/email-password-login/`** — restrict to admin users.
   Add a `role` column on users; require `role === 'admin'` in
   middleware.
2. **`data-display/sortable-table/`** — once per managed resource.
   This is the bulk of the panel — one tab per resource.
3. **`forms/settings-page/`** — adapt for "edit one record"
   screens. Same dirty-state-aware form pattern.
4. **`uploads/profile-photo-upload/`** — only if some resources
   include images (product photos, document attachments).

## What you'll build on top

Custom code with no example coverage:

- **Permission middleware** — `requireRole('admin')` Express
  middleware that checks `res.locals.session.role`. One-liner.
- **Layout shell** — sidebar + main pane. Use the
  `.agents/skills/patterns/dashboard-shell-layout.md` pattern.
- **Bulk actions** — checkbox column + "Approve N selected"
  button. The DataTable supports a selection mode; wire it up
  to a batch handler.
- **Per-resource CRUD pages** — one page per resource. They all
  share the same shape: list page (sortable-table) + detail page
  (settings-page-style form).

## Anti-patterns

- Do not invent `@molecule/app-admin` or `@molecule/api-cms`.
  Admin panels are compositions.
- Do not use the same auth flow for admins and regular users.
  Either gate by role on the same login, or have a separate
  `/admin/login` route.
- Do not let admins delete records without a confirm dialog —
  destructive actions need a checkpoint.
- Do not skip an audit log if the data is sensitive (orders,
  PII, finances). Log who did what, when.

## Verify

Sign in as admin → see sidebar of resources → click "Users" →
sortable paginated table → click a row → edit form → save →
return to list → change reflected.
