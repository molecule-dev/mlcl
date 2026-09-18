# Page observations: /home (Home)

Authenticated landing page: today session card, streak, KPIs, recommended sessions.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role                   | expected behavior on interaction                                                                  | success signal                                      | failure signal                                    |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| `getByText(/today.s session/i)` block     | section                | renders the daily hero session pulled from /api/sessions (first published)                        | today session card visible with title + duration    | card missing or empty                             |
| `getByRole("link", { name: /begin session | start/i })` (hero CTA) | link                                                                                              | navigates to /sessions/<slug> for the today session | href starts with /sessions/, URL changes on click | broken href |
| streak/sessions KPI tiles                 | section                | fetches /api/stats/streak and /api/stats/summary; renders integer counters (0 for fresh accounts) | tiles visible with numeric values                   | tiles render dashes/NaN                           |
| recommended grid `a[href^="/sessions/"]`  | links                  | fetches /api/sessions and renders ≥1 recommendation card linking to a session detail page         | at least one /sessions/<slug> link is rendered      | grid empty                                        |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected |
| ------------ | ------ | ------------------ | -------------------------------------- |
| initial load | GET    | /api/sessions      | 200 with seeded sessions               |
| initial load | GET    | /api/categories    | 200 with categories array              |
| initial load | GET    | /api/stats/streak  | 200 with { current, longest }          |
| initial load | GET    | /api/stats/summary | 200 with totals                        |
| initial load | GET    | /api/preferences   | 200 with user prefs                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
