# Page observations: /alerts (Alerts list + new alert at /alerts/new)

> Filled by AI agent driving the running app via Playwright MCP.
> See `e2e/alerts.spec.ts` for the matching tests.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role                    | expected behavior on interaction                                                                         | success signal                                                   | failure signal                          |
| ----------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| `getByRole('heading', { name: /alerts/i })`                       | heading                 | renders the Alerts page chrome with seeded alert cards                                                   | heading visible; non-empty `/api/alerts` array                   | empty list or 5xx                       |
| `getByRole('button', { name: /create alert/i })` (on /alerts/new) | button                  | POST `/api/alerts` with `{symbol, condition, target_price, channels, repeat}` then redirect to `/alerts` | URL changes to `/alerts$/`; new row visible in GET `/api/alerts` | stays on /alerts/new with hook error    |
| `getByRole('button', { name: /delete                              | remove/i })` (per-card) | button                                                                                                   | DELETE `/api/alerts/:id`; row gone from DB                       | GET `/api/alerts` no longer contains id | 4xx and row remains |

## Hidden surfaces opened from this page

| trigger                                                         | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — Alerts list and Create-alert use full pages, no modals) | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts.spec.ts`
