# Page observations: /history (History)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role                 | expected behavior on interaction                              | success signal                 | failure signal                |
| ------------------------------------------------------------ | -------------------- | ------------------------------------------------------------- | ------------------------------ | ----------------------------- |
| `getByRole('heading', { name: /^Run history$/i, level: 1 })` | heading              | renders page heading after auth bootstrap                     | heading visible                | redirect to /login            |
| `[data-mol-id="history-filter-all"]`                         | button (filter chip) | resets the visible bucket to All — URL hash becomes `#all`    | URL ends with `#all`           | hash unchanged                |
| `[data-mol-id="history-filter-success"]`                     | button (filter chip) | filters the visible rows to 2xx — URL hash becomes `#success` | URL ends with `#success`       | hash unchanged                |
| `[data-mol-id="history-filter-redirect"]`                    | button (filter chip) | filters to 3xx — URL hash becomes `#redirect`                 | URL ends with `#redirect`      | hash unchanged                |
| `[data-mol-id="history-filter-clientError"]`                 | button (filter chip) | filters to 4xx — URL hash becomes `#clientError`              | URL ends with `#clientError`   | hash unchanged                |
| `[data-mol-id="history-filter-serverError"]`                 | button (filter chip) | filters to 5xx — URL hash becomes `#serverError`              | URL ends with `#serverError`   | hash unchanged                |
| `getByText(/Nothing here yet/i)`                             | empty-state copy     | renders when the user has zero history rows                   | text visible on a fresh signup | text missing while count == 0 |
| `getByText(/realtime/i)`                                     | status pill          | "realtime" indicator next to the H1                           | visible                        | missing                       |

## Hidden surfaces opened from this page

| trigger                                                                         | what it opens | elements inside |
| ------------------------------------------------------------------------------- | ------------- | --------------- |
| (none — page is a flat list with filter chips; no menus, modals, or accordions) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected |
| --------- | ------ | --------------------- | -------------------------------------- |
| Page load | GET    | /api/history?limit=50 | most recent 50 history rows            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/history.spec.ts`
