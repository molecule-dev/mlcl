# Page observations: /search (Search)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                       | role                     | expected behavior on interaction                                        | success signal                            | failure signal                  |
| ------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| `getByTestId("search-input")`                    | textbox (search)         | accept query; filter announcements/channels/people across the workspace | typing narrows results to matches         | empty list when nothing matches |
| `getByTestId("search-filter-all")`               | button                   | shows all result kinds                                                  | active styling, all categories visible    | nothing                         |
| `getByTestId("search-filter-announcement")`      | button                   | shows announcements only                                                | active styling, only announcement results | other kinds visible             |
| `getByTestId("search-filter-channel")`           | button                   | shows channels only                                                     | active styling, only channels             | other kinds visible             |
| `getByTestId("search-filter-person")`            | button                   | shows people only                                                       | active styling, only people               | other kinds visible             |
| announcement result link                         | link `/announcement/:id` | navigates to detail                                                     | URL changes                               | stays                           |
| `getByRole("button", { name: /Sign out           | SIGN OUT/i })`           | button                                                                  | logs out                                  | URL `/login`                    | unchanged |
| `getByRole("button", { name: /Toggle theme/i })` | button                   | flips theme                                                             | `data-mol-mode` flips                     | unchanged                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| Page load | GET    | `/api/announcements` | list announcements                     |
| Page load | GET    | `/api/categories`    | list channels                          |
| Page load | GET    | `/api/team`          | list team members                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
