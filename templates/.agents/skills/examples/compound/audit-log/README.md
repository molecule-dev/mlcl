---
name: audit-log
intent: |
  - "Audit log"
  - "Activity history"
  - "Who did what when"
  - "Compliance trail"
  - "Change log for sensitive actions"
keywords: [audit, log, activity, history, trail, compliance, accountability]
---

# Audit log (compound — multi-feature roadmap)

**This isn't a single example.** An audit log is the
`@molecule/api-audit` bond (recording) + a viewer + a retention job.
Read this README, then read each linked example.

## Build order

1. **`@molecule/api-audit` + `@molecule/api-audit-database`** — the recording
   layer. `setProvider(provider)` at startup, then `log(...)` from every
   sensitive handler (see below). Do NOT hand-roll a table + helper.
2. **`data-display/sortable-table/`** — the audit-log viewer over the records,
   filterable by actor, action type, and date range.
3. **`data-display/csv-export/`** — auditors usually want a downloadable copy.
   Same pattern, scoped to the audit records.

## What you'll build on top

Recording IS a molecule package — do NOT hand-roll a table + helper:

- **Audit recording** — `@molecule/api-audit` (+ `@molecule/api-audit-database`
  to persist to your DB, or `-file`). Wire once: `import { setProvider } from
'@molecule/api-audit'` + `import { provider } from '@molecule/api-audit-database'`
  → `setProvider(provider)`. Then from every sensitive handler:
  ```typescript
  import { log } from '@molecule/api-audit'
  await log({
    actor: `user:${userId}`,
    action: 'role_changed',
    resource: 'user',
    resourceId: targetId,
    details: { before, after }, // diffs, NOT PII
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })
  ```
  Each call is its own immutable row (`log()` never mutates); read them back for
  the viewer with `query({ actor, page, perPage })`.
- **Viewer** — `data-display/sortable-table/` over the audit records (filter by
  actor/action/date) + `data-display/csv-export/` for the auditor download.
- **Retention** — a daily cron (`@molecule/api-cron`, see `jobs/scheduled-tasks/`)
  prunes records older than N days (regulatory minimum is often 1 year). A real
  cron, never `setInterval`.

## Anti-patterns

- Do not invent `@molecule/api-audit-log`, and do not hand-roll an
  `audit_log` table + `logAudit()` helper — the package IS
  `@molecule/api-audit` (core: `log()` to record, `query()` to read) +
  `@molecule/api-audit-database` / `-file` (providers).
- Do not log to the same database row by mutating an existing one.
  Each event is its own row.
- Do not put PII (SSNs, passwords) in `before` / `after`. Log
  primary keys + diffs of non-sensitive fields.
- Do not skip retrieving the `before` value. "Updated user
  email" is useless without knowing what it was before.
- Do not gate the audit log behind admin-only access if your
  compliance regime requires user data subject access — users
  can request their own audit trail.

## Verify

Admin updates a user's role → audit log shows
`role_changed: 'member' → 'admin'` with timestamp + IP. Filter by
`actor_user_id = X` → see all actions by that admin. Export to
CSV → spreadsheet has every action.
