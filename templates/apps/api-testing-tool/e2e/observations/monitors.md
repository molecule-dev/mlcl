# Page observations: /monitors (Monitors)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role             | expected behavior on interaction                                   | success signal                                                                               | failure signal                     |
| --------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| `getByRole('heading', { name: /^Monitors$/i, level: 1 })` | heading          | renders page heading after auth bootstrap                          | heading visible                                                                              | redirect to /login                 |
| `[data-mol-id="monitors-new"]`                            | button           | POST `/api/monitors` then refresh list — appends a new monitor row | a POST to `/api/monitors` is observed AND `[data-mol-id^="monitor-row-"]` count grows by one | no network call or count unchanged |
| `getByText(/No monitors scheduled/i)`                     | empty-state copy | renders when the user has zero monitors                            | text visible on a fresh signup                                                               | text missing while count == 0      |
| `getByText(/Scheduled checks fired by the cron worker/i)` | sub-heading      | description copy under the H1                                      | visible                                                                                      | missing                            |
| `getByText(/Avg uptime                                    | Healthy          | Degraded                                                           | Down/i)`                                                                                     | metric eyebrows                    | the four MetricStatCards render eyebrow text | all four eyebrow strings are visible | one or more missing |

## Hidden surfaces opened from this page

| trigger                                                      | what it opens | elements inside |
| ------------------------------------------------------------ | ------------- | --------------- |
| (none — each monitor row renders inline; no menus or modals) | —             | —               |

## Network calls expected during normal use

| trigger     | method | path          | what request body or query is expected |
| ----------- | ------ | ------------- | -------------------------------------- |
| Page load   | GET    | /api/monitors | array of monitor rows                  |
| New monitor | POST   | /api/monitors | `{ name, cron_schedule, is_active }`   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/monitors.spec.ts`
