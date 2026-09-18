# Page observations: /collections (Collections)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role                      | expected behavior on interaction                                          | success signal                                                                 | failure signal                                            |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `getByRole('heading', { name: /^Collections$/i, level: 1 })` | heading                   | renders page heading after auth bootstrap                                 | heading visible                                                                | redirect to /login                                        |
| `getByRole('button', { name: /New collection/i })`           | button                    | POST `/api/collections` then refresh list — appends a new collection card | a POST to `/api/collections` is observed AND the collections list grows by one | no network call or count unchanged                        |
| `[data-mol-id^="collection-tree-"] disclosure`               | button (toggle)           | toggles the request list inside a collection card open/closed             | clicking flips `aria-expanded` between `true`/`false`                          | nothing changes                                           |
| `getByText(/Collections                                      | Requests                  | Run last hour                                                             | Failing/i)`                                                                    | metric eyebrow labels                                     | the four MetricStatCards render eyebrow text | all four eyebrow strings are visible | one or more missing |
| `getByText(/No collections yet/i)`                           | empty state copy          | renders when the user has zero collections                                | text visible on a fresh signup                                                 | text missing while count == 0                             |
| `getByText(/All green                                        | Last run had failures/i)` | metric caption                                                            | shows `All green` if no failed requests else failure count caption             | one of the two strings is visible inside the failing card | neither rendered                             |

## Hidden surfaces opened from this page

| trigger                                             | what it opens                        | elements inside                                                     |
| --------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| Click on the disclosure inside `CollectionTreeItem` | the request rows for that collection | each row exposes `MethodBadge` + path + `last_run_status` indicator |

## Network calls expected during normal use

| trigger        | method | path                   | what request body or query is expected                    |
| -------------- | ------ | ---------------------- | --------------------------------------------------------- |
| Page load      | GET    | /api/collections       | array of collection rows                                  |
| Page load      | GET    | /api/requests          | array of request rows used to nest under their collection |
| Page load      | GET    | /api/history?limit=200 | latest history per request used for last-run badges       |
| New collection | POST   | /api/collections       | `{ name, description }`                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/collections.spec.ts`
