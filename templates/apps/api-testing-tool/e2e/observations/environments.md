# Page observations: /environments (Environments)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role                                  | expected behavior on interaction                                           | success signal                                                                       | failure signal                                            |
| ------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `getByRole('heading', { name: /^Environments$/i, level: 1 })` | heading                               | renders page heading after auth bootstrap                                  | heading visible                                                                      | redirect to /login                                        |
| `getByRole('button', { name: /New environment/i })`           | button                                | POST `/api/environments` then refresh list — appends a new EnvironmentCard | a POST to `/api/environments` is observed AND the EnvironmentCard count grows by one | no network call or count unchanged                        |
| `getByText(/No environments yet/i)`                           | empty-state copy                      | renders when the user has zero environments                                | text visible on a fresh signup                                                       | text missing while count == 0                             |
| `getByText(/Loading environments/i)`                          | loading copy                          | renders briefly while the GET resolves                                     | visible at first paint                                                               | never visible (would mean SSR-shaped state, not this app) |
| `getByText(/\$ pylon env --switch/)`                          | eyebrow / kicker text                 | terminal-style banner above the heading                                    | visible                                                                              | missing                                                   |
| `getByText(/One active environment per workspace              | Variables that swap into requests/i)` | sub-heading                                                                | description copy under the H1                                                        | visible                                                   | missing |

## Hidden surfaces opened from this page

| trigger                                                                             | what it opens | elements inside |
| ----------------------------------------------------------------------------------- | ------------- | --------------- |
| (none — `EnvironmentCard` content is rendered inline; no menus/modals on this page) | —             | —               |

## Network calls expected during normal use

| trigger         | method | path              | what request body or query is expected     |
| --------------- | ------ | ----------------- | ------------------------------------------ |
| Page load       | GET    | /api/environments | array of environment rows with `variables` |
| New environment | POST   | /api/environments | `{ name, variables, is_active }`           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/environments.spec.ts`
