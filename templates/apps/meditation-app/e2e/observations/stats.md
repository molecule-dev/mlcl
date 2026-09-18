# Page observations: /stats (Stats)

Dashboard of streaks, weekly minutes, and per-day breakdown.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                                      | success signal                                                | failure signal       |
| ----------------------------------------------------- | ------- | --------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------- |
| KPI tiles (streak, total minutes, sessions completed) | list    | render numeric KPI counters from /api/stats/* endpoints               | each tile visible with a numeric value (0 for fresh accounts) | tiles missing or NaN |
| weekly bar chart / per-day rows                       | figure  | renders one row/bar per day for the last 7 days from /api/stats/daily | 7 day labels visible                                          | chart missing        |
| streak headline (current + longest streak)            | heading | shows current and longest streak counts from /api/stats/streak        | streak numbers visible                                        | streak missing       |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected |
| ------------ | ------ | ------------------ | -------------------------------------- |
| initial load | GET    | /api/stats/streak  | 200 with { current, longest }          |
| initial load | GET    | /api/stats/summary | 200 with totals                        |
| initial load | GET    | /api/stats/daily   | 200 with array of daily buckets        |
| initial load | GET    | /api/preferences   | 200 with user prefs (weekly goal)      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
