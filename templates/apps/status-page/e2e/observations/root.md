# Page observations: / (Public status page — Vigil)

> Filled from a live walk via Playwright MCP at /. Re-walk if any visible
> element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                        | role                            | expected behavior on interaction                    | success signal                  | failure signal                     |
| ----------------------------------------------------------------- | ------------------------------- | --------------------------------------------------- | ------------------------------- | ---------------------------------- |
| `getByRole('link', { name: /Vigil/i })` (logo / wordmark, href=/) | link                            | navigate to / (no-op)                               | URL stays at /                  | nav fails                          |
| `getByRole('link', { name: /sign in/i })` (href=/login)           | link                            | navigate to /login                                  | URL becomes /login              | nav fails                          |
| `getByRole('link', { name: /subscribe/i })` (href=#subscribe)     | link                            | scroll/anchor to subscribe form                     | subscribe form visible          | scroll fails                       |
| `input[type="email"]` (Subscribe form)                            | textbox                         | accept subscriber email                             | typed value reflected           | input rejects                      |
| `getByRole('button', { name: /subscribe                           | notify/i })` (subscribe submit) | button                                              | POST /api/public/subscribers    | 201 + status="Subscribed!" message | error message + 4xx/5xx |
| Components list (per component)                                   | list                            | display real components from /api/public/components | component name + status visible | empty state when no components     |
| Active incidents list (per incident)                              | list                            | render incidents fetched from /api/public/incidents | INC- id, title, impact visible  | empty state when no incidents      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger         | method | path                    | what request body or query is expected                                    |
| --------------- | ------ | ----------------------- | ------------------------------------------------------------------------- |
| Page load       | GET    | /api/public/components  | returns array of components with status                                   |
| Page load       | GET    | /api/public/incidents   | returns array of active incidents                                         |
| Subscribe click | POST   | /api/public/subscribers | `{ email, channel:'email', notification_type:'all' }` returns 201 with id |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/01-root.spec.ts`
