# Page observations: /routes (Routes / Dispatch)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — demo seed populates ~6 routes with origin/destination across all statuses.

## Elements

| selector / accessible name                                  | role          | expected behavior on interaction                                                     | success signal                                         | failure signal                                     |
| ----------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------- |
| `getByRole('heading', { name: /^routes$/i, level: 1 })`     | heading       | page heading                                                                         | heading visible                                        | shell error                                        |
| `getByText(/\\d+ routes/i)`                                 | text          | subheader shows visible count under current filter                                   | "N routes" non-zero with default `active` filter       | "0 routes"                                         |
| `getByRole('button', { name: /\\+ new dispatch/i })`        | button        | open create dispatch dialog                                                          | dialog with heading "New dispatch"                     | nothing happens                                    |
| `getByRole('navigation', { name: /filter routes/i })`       | navigation    | wraps status chips                                                                   | landmark present                                       | missing                                            |
| `getByRole('button', { name: /^active$/i, pressed: true })` | toggle button | default filter — only `status === 'active'` (DB `in_progress` mapped)                | aria-pressed=true; rows visible (≥1 with default seed) | "0 routes" — would mean DB→FE status mapping broke |
| `getByRole('button', { name: /^planned$/i })`               | toggle button | filter to `status === 'planned'`                                                     | only planned rows                                      | unchanged                                          |
| `getByRole('button', { name: /^completed$/i })`             | toggle button | filter to completed                                                                  | only completed rows                                    | unchanged                                          |
| `getByRole('button', { name: /^deviated$/i })`              | toggle button | filter to deviated                                                                   | only deviated rows                                     | unchanged                                          |
| `getByRole('button', { name: /^all$/i })`                   | toggle button | show full list                                                                       | full count                                             | unchanged                                          |
| `getByText(/\\d+ active dispatches · live/i)` (map overlay) | text          | overlay caption on map placeholder                                                   | matches active count                                   | absent / NaN                                       |
| First route card                                            | article       | renders name + origin → destination + vehicle/driver/stops/miles + ETA + status chip | card visible with origin & destination NON-empty       | "→ → →" or empty origin / destination              |
| First route status chip                                     | text          | reflects FE-shaped status (DB `in_progress` → FE `active`)                           | one of {active, planned, completed, deviated}          | "in_progress" leaking through                      |

## Hidden surfaces opened from this page

| trigger                        | what it opens                               | elements inside (selector / role / behavior)                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `+ New dispatch` button        | modal `role="dialog"` titled "New dispatch" | name textbox (required), vehicle select (options from `/api/vehicles`), driver select (options from `/api/drivers`), scheduled datetime-local input, Cancel button (closes), Dispatch submit button (POST /api/routes) |
| Click outside dialog (overlay) | closes dialog without submitting            | dialog removed                                                                                                                                                                                                         | dialog stays |

## Network calls expected during normal use

| trigger                     | method | path          | what request body or query is expected                      |
| --------------------------- | ------ | ------------- | ----------------------------------------------------------- |
| Initial mount               | GET    | /api/routes   | full route list (with `origin` and `destination` populated) |
| Initial mount (parallel)    | GET    | /api/vehicles | vehicle option list                                         |
| Initial mount (parallel)    | GET    | /api/drivers  | driver option list                                          |
| Submit "Dispatch" in dialog | POST   | /api/routes   | `{ name, vehicle_id?, driver_id?, scheduled_date?: ISO }`   |
| After successful POST       | GET    | /api/routes   | refetch — new route appears                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/routes.spec.ts`
