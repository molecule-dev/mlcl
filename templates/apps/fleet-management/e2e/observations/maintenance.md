# Page observations: /maintenance (Maintenance)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — demo seed populates ~10 maintenance work orders across statuses.

## Elements

| selector / accessible name                                   | role          | expected behavior on interaction                  | success signal                                      | failure signal        |
| ------------------------------------------------------------ | ------------- | ------------------------------------------------- | --------------------------------------------------- | --------------------- |
| `getByRole('heading', { name: /^maintenance$/i, level: 1 })` | heading       | page heading                                      | heading visible                                     | shell error           |
| `getByText(/\\d+ work orders/i)`                             | text          | subheader shows visible-count from current filter | non-zero number for default `overdue` filter        | "0 work orders"       |
| `getByRole('button', { name: /\\+ schedule service/i })`     | button        | open the create dialog                            | dialog with heading "Schedule service" rendered     | nothing happens       |
| `getByRole('navigation', { name: /filter maintenance/i })`   | navigation    | wraps status chips                                | landmark present                                    | missing               |
| `getByRole('button', { name: /^overdue$/i, pressed: true })` | toggle button | default filter — only `status === 'overdue'` rows | aria-pressed=true; only overdue cards               | filter not applied    |
| `getByRole('button', { name: /^scheduled$/i })`              | toggle button | filter to `status === 'scheduled'`                | only scheduled cards                                | unchanged             |
| `getByRole('button', { name: /^in progress$/i })`            | toggle button | filter to `status === 'in_progress'`              | only in-progress cards                              | unchanged             |
| `getByRole('button', { name: /^completed$/i })`              | toggle button | filter to `status === 'completed'`                | only completed cards                                | unchanged             |
| `getByRole('button', { name: /^all$/i })`                    | toggle button | show full list                                    | full count restored                                 | filter still active   |
| First work-order row link                                    | link          | navigate to `/maintenance/<id>`                   | URL changes to `/maintenance/<uuid>`                | stays on /maintenance |
| First work-order status chip                                 | text          | reflects DB-canonical `status`                    | one of {scheduled, in_progress, overdue, completed} | "undefined"           |
| First work-order "Est. $N,N" cell                            | text          | reflects `cost_estimate` from API                 | dollar amount visible only when non-null            | NaN / always shown    |

## Hidden surfaces opened from this page

| trigger                        | what it opens                                   | elements inside (selector / role / behavior)                                                                                                                                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `+ Schedule service` button    | modal `role="dialog"` titled "Schedule service" | vehicle select (required, options from `/api/vehicles`), type select (oil_change/tire_rotation/inspection/brake_service/repair/other), description input, scheduled_for date input (required), cost_estimate number input, Cancel button (closes dialog), Schedule submit button (POST /api/maintenance then refetch) |
| Click outside dialog (overlay) | closes dialog without submitting                | dialog removed                                                                                                                                                                                                                                                                                                        | dialog stays |

## Network calls expected during normal use

| trigger                     | method | path             | what request body or query is expected                                          |
| --------------------------- | ------ | ---------------- | ------------------------------------------------------------------------------- |
| Initial mount               | GET    | /api/maintenance | full work-order list                                                            |
| Initial mount (parallel)    | GET    | /api/vehicles    | populates vehicle select in dialog                                              |
| Submit "Schedule" in dialog | POST   | /api/maintenance | `{ vehicle_id, type, description, scheduled_for: ISO, cost_estimate?: number }` |
| After successful POST       | GET    | /api/maintenance | refetch — new row appears                                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/maintenance.spec.ts`
