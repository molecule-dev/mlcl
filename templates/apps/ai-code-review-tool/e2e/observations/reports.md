# Page observations: /reports

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/reports`.
> Auth-required. Walked twice — once with no data (empty trend), then with seeded
> reviews so the badges and lists fill in.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                    | role    | expected behavior on interaction                                            | success signal                                    | failure signal                      |
| --------------------------------------------- | ------- | --------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------- |
| `getByRole('heading', { name: /^Reports$/ })` | heading | renders page heading                                                        | h1 visible                                        | missing                             |
| range button `7d`                             | button  | sets `range=7`, aria-pressed=true; refetches summary + trend with `?days=7` | aria-pressed=true AND new GETs fire with `days=7` | filter does not apply               |
| range button `30d` (default)                  | button  | sets `range=30`, aria-pressed=true                                          | aria-pressed=true                                 | nothing happens                     |
| range button `90d`                            | button  | sets `range=90`, refetches with `days=90`                                   | new GETs include `days=90`                        | nothing happens                     |
| severity badge row                            | section | shows critical / changes_requested / suggestion / approved                  | row renders with seeded counts                    | counts wrong                        |
| trend chart `<svg>`                           | img     | renders area + line path when at least one completed review                 | path elements present                             | empty-state copy when reviews exist |
| top repositories list                         | list    | one row per top-repo from `/api/reports/top-repos`                          | seeded repo full_name visible                     | empty when seeded                   |
| reviewer leaderboard list                     | list    | one row per author_login from `/api/reports/leaderboard`                    | seeded `author_login` visible                     | empty when seeded                   |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside (selector / role / behavior) |
| ------- | -------------------------------- | -------------------------------------------- |
| (none)  | reports page has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger            | method | path                           | what request body or query is expected |
| ------------------ | ------ | ------------------------------ | -------------------------------------- |
| initial load       | GET    | `/api/reports/summary?days=30` | aggregate KPI summary                  |
| initial load       | GET    | `/api/reports/top-repos`       | top repositories by PR count           |
| initial load       | GET    | `/api/reports/leaderboard`     | reviewer leaderboard                   |
| initial load       | GET    | `/api/reports/trend?days=30`   | quality-score series + days            |
| initial load       | GET    | `/api/reports/severity-counts` | severity tallies                       |
| range change to 7d | GET    | `/api/reports/summary?days=7`  | refetched summary                      |
| range change to 7d | GET    | `/api/reports/trend?days=7`    | refetched trend                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (no forms; range is a button group)
- [x] Every link href / route destination is documented (no links)
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
