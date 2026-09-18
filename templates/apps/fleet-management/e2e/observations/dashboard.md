# Page observations: /dashboard (Dashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — demo seed populates ~12 vehicles, 7 alerts, etc.

## Elements

| selector / accessible name                                   | role      | expected behavior on interaction                    | success signal                         | failure signal      |
| ------------------------------------------------------------ | --------- | --------------------------------------------------- | -------------------------------------- | ------------------- |
| `getByRole('heading', { name: /fleet command/i, level: 1 })` | heading   | KPI hero heading                                    | heading visible after load             | "Failed to load."   |
| Active fleet KPI value                                       | statistic | reflects vehicles count from /api/reports/fleet     | non-zero number ≥ 10 (~12 seeded)      | "0" or absent       |
| Drivers on duty KPI                                          | statistic | reflects drivers_active from /api/reports/fleet     | non-zero number                        | "0"                 |
| Active alerts KPI                                            | statistic | reflects active_alerts from /api/reports/fleet      | non-zero number reflects ~5 unresolved | "0"                 |
| `getByRole('link', { name: /view all/i }).first()`           | link      | navigate to /vehicles                               | URL ends with /vehicles                | stays on /dashboard |
| Activity feed list                                           | list      | rendered from /api/vehicles (in_transit/idle/alert) | at least one row visible               | empty placeholder   |
| Alerts highlight card link                                   | link      | navigate to /alerts                                 | URL ends with /alerts                  | stays on /dashboard |

## Hidden surfaces opened from this page

| trigger                      | what it opens | elements inside (selector / role / behavior) |
| ---------------------------- | ------------- | -------------------------------------------- |
| (none — single page summary) | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                   | what request body or query is expected |
| ------------- | ------ | ---------------------- | -------------------------------------- |
| Initial mount | GET    | /api/reports/fleet     | aggregate stats                        |
| Initial mount | GET    | /api/vehicles          | list vehicles                          |
| Initial mount | GET    | /api/alerts            | list alerts                            |
| Initial mount | GET    | /api/reports/analytics | daily miles series                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
