# Page observations: /mocks (Mocks)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role             | expected behavior on interaction                              | success signal                                                                          | failure signal                     |
| ------------------------------------------------------------- | ---------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| `getByRole('heading', { name: /^Mock servers$/i, level: 1 })` | heading          | renders page heading after auth bootstrap                     | heading visible                                                                         | redirect to /login                 |
| `[data-mol-id="mocks-new"]`                                   | button           | POST `/api/mocks` then refresh list — appends a new mock card | a POST to `/api/mocks` is observed AND `[data-mol-id^="mock-card-"]` count grows by one | no network call or count unchanged |
| `getByText(/No mocks yet/i)`                                  | empty-state copy | renders when the user has zero mocks                          | text visible on a fresh signup                                                          | text missing while count == 0      |
| `getByText(/Spin up deterministic stand-ins/i)`               | sub-heading      | description copy under the H1                                 | visible                                                                                 | missing                            |
| `getByText(/Mocks                                             | Public           | Endpoints                                                     | Avg latency/i)`                                                                         | metric eyebrows                    | the four MetricStatCards render eyebrow text | all four eyebrow strings are visible | one or more missing |

## Hidden surfaces opened from this page

| trigger                                                                        | what it opens | elements inside |
| ------------------------------------------------------------------------------ | ------------- | --------------- |
| (none — each `[data-mol-id^="mock-card-"]` renders inline; no menus or modals) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path       | what request body or query is expected                                       |
| --------- | ------ | ---------- | ---------------------------------------------------------------------------- |
| Page load | GET    | /api/mocks | array of mock rows                                                           |
| New mock  | POST   | /api/mocks | `{ name, path_pattern, method, response_status, response_body, latency_ms }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/mocks.spec.ts`
