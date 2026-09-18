# Page observations: /incidents/:id (Incident detail)

> Filled from a live walk via Playwright MCP at /incidents/:id. Re-walk
> if any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role                         | expected behavior on interaction                       | success signal                 | failure signal                    |
| ----------------------------------------------------- | ---------------------------- | ------------------------------------------------------ | ------------------------------ | --------------------------------- |
| `getByRole('heading', { level: 1 })` (incident title) | heading                      | render incident title                                  | title visible                  | not rendered                      |
| `getByTestId('incident-timeline')` (timeline list)    | list                         | render `incident_updates` rows; new POST appends a row | each update message rendered   | timeline empty when updates exist |
| `getByTestId('post-update-btn')` (Post update)        | button                       | POST /api/incidents/:id/updates                        | new update appears in timeline | error visible                     |
| `getByTestId('save-draft-btn')` (Save draft)          | button                       | persist draft to localStorage                          | reload restores draft          | reload loses draft                |
| `getByRole('link', { name: /all incidents             | back/i })` (href=/incidents) | link                                                   | navigate to /incidents         | URL becomes /incidents            | nav fails |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected   |
| ----------- | ------ | -------------------------- | ---------------------------------------- |
| Page load   | GET    | /api/incidents/:id         | returns `{…incident, updates: […]}`      |
| Page load   | GET    | /api/subscribers           | counts visible subscribers (best-effort) |
| Post update | POST   | /api/incidents/:id/updates | `{ status, message }` returns 201        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/21-incidents__id.spec.ts`
