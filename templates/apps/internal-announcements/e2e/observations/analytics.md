# Page observations: /analytics (Analytics)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                       | role           | expected behavior on interaction                                              | success signal                                                            | failure signal |
| ------------------------------------------------ | -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------- |
| `getByTestId("analytics-range-7d")`              | button         | selects "Last 7 days" range; recomputes summary cards from real announcements | active button styling switches AND visible numbers reflect last-7d window | nothing        |
| `getByTestId("analytics-range-30d")`             | button         | selects "Last 30 days" range                                                  | active styling switches                                                   | nothing        |
| `getByTestId("analytics-range-qtd")`             | button         | selects "Quarter to date" range                                               | active styling switches                                                   | nothing        |
| stat card (e.g. "Posts", "Reach", "Acks")        | text           | renders aggregated number                                                     | number visible                                                            | placeholder    |
| `getByRole("button", { name: /Sign out           | SIGN OUT/i })` | button                                                                        | logs out                                                                  | URL `/login`   | unchanged |
| `getByRole("button", { name: /Toggle theme/i })` | button         | flips theme                                                                   | `data-mol-mode` flips                                                     | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected                |
| --------- | ------ | -------------------- | ----------------------------------------------------- |
| Page load | GET    | `/api/announcements` | list announcements (analytics aggregates client-side) |
| Page load | GET    | `/api/categories`    | channels for breakdown                                |
| Page load | GET    | `/api/team`          | team members for reach calc                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/analytics.spec.ts`
