# Page observations: /audit (Audit log)

> Filled from a live walk via Playwright MCP at /audit. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction                | success signal                | failure signal     |
| -------------------------- | -------- | ----------------------------------------------- | ----------------------------- | ------------------ |
| Audit list                 | list     | render rows fetched from /api/audit             | rows visible                  | error state        |
| Each audit row             | listitem | shows action, scope, target, summary, timestamp | row content visible           | row malformed      |
| Empty state                | text     | "no audit entries yet" when there are none      | empty state visible when zero | shown despite rows |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path       | what request body or query is expected         |
| --------- | ------ | ---------- | ---------------------------------------------- |
| Page load | GET    | /api/audit | array of audit_log rows scoped to current user |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-audit.spec.ts`
