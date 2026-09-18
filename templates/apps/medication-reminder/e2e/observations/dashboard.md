# Page observations: /dashboard (Dashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role   | expected behavior on interaction                           | success signal                                             | failure signal                       |
| ------------------------------------ | ------ | ---------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| Today hero card (taken/total)        | group  | reflects `/api/reports/today` (taken_count / total_doses)  | numbers match seeded dose state                            | shows 0 / 0 after seeded data        |
| AdherenceTriad streak/refill metrics | group  | renders streaks + refills_due_soon from /api/reports/today | streaks display correct numbers                            | renders dashes                       |
| Today's doses list                   | list   | renders rows from `GET /api/doses?filter=today`            | seeded medication's dose row visible                       | empty placeholder shown despite seed |
| Mark taken button (per dose)         | button | POSTs /api/doses/:id/take, optimistic UI + persisted       | dose row updates to taken; refetched dose has status=taken | row stays pending after click        |
| `All medications →` link             | link   | navigates to /medications                                  | URL is /medications                                        | stays on /dashboard                  |
| `Weekly schedule →` link             | link   | navigates to /schedule                                     | URL is /schedule                                           | stays on /dashboard                  |
| `Adherence report →` link            | link   | navigates to /reports                                      | URL is /reports                                            | stays on /dashboard                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger          | method | path                    | what request body or query is expected |
| ---------------- | ------ | ----------------------- | -------------------------------------- |
| Page mount       | GET    | /api/doses?filter=today | (none)                                 |
| Page mount       | GET    | /api/reports/today      | (none)                                 |
| Page mount       | GET    | /api/reports/adherence  | (none)                                 |
| Mark taken click | POST   | /api/doses/:id/take     | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
