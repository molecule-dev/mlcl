# Page observations: /audit (AuditLog)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role         | expected behavior on interaction                                 | success signal                                  | failure signal  |
| ---------------------------------------------------- | ------------ | ---------------------------------------------------------------- | ----------------------------------------------- | --------------- |
| `getByRole('heading', { name: /audit/i, level: 1 })` | heading      | render the page title                                            | visible                                         | absent          |
| Category filter chips                                | radio/button | narrow list to a category (endpoints / auth / billing / all)     | only matching rows visible                      | unfiltered      |
| Audit rows                                           | listitem     | each row shows action + actor + timestamp from /api/audit_events | rows reflect server state after a recent action | stale / fake    |
| Export JSON button                                   | button       | downloads /api/audit_events as JSON                              | a `download` event fires; file size > 0         | nothing happens |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger    | method | path              | what request body or query is expected |
| ---------- | ------ | ----------------- | -------------------------------------- |
| Page mount | GET    | /api/audit_events | hydrate the list                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/audit.spec.ts`
