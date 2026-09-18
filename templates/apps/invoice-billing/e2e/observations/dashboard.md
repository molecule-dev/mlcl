# Page observations: /dashboard (Dashboard)

> Authed home. Shows revenue KPI cards, recent invoices list, and a
> recent-activity feed. Initial load fires three GETs:
> `/api/dashboard/summary`, `/api/dashboard/activity`, `/api/invoices`.
> A new user lands here with the demo seed already populated (4 demo
> clients, 5 demo invoices, payments).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                      | success signal                                             | failure signal  |
| -------------------------------------------------------- | ------- | ----------------------------------------------------- | ---------------------------------------------------------- | --------------- |
| `getByRole('heading', { name: /Welcome back/ })`         | heading | static welcome                                        | visible                                                    | missing         |
| `getByRole('link', { name: /^New invoice$/ })` (KPI CTA) | link    | navigates to `/invoices/new`                          | URL ends `/invoices/new`                                   | stays           |
| `getByRole('link', { name: /^New client$/ })` (KPI CTA)  | link    | navigates to `/clients`                               | URL ends `/clients`                                        | stays           |
| `getByText(/Total Outstanding/)`                         | heading | KPI block from `GET /api/dashboard/summary`           | shows formatted currency, not "$NaN"                       | missing         |
| `getByText(/Recent invoices/)` (section heading)         | heading | renders most-recent invoices from `GET /api/invoices` | at least one demo invoice number visible (e.g. "INV-1042") | empty / missing |
| `getByText(/Recent activity/)` (section heading)         | heading | renders feed from `GET /api/dashboard/activity`       | at least one activity row visible (e.g. "paid")            | empty / missing |
| `getByRole('button', { name: /Toggle theme/ })`          | button  | flips `<html data-theme>`, persists across reload     | dataset.theme flips, persists                              | unchanged       |

## Hidden surfaces opened from this page

| trigger                                           | what it opens     | elements inside (selector / role / behavior) |
| ------------------------------------------------- | ----------------- | -------------------------------------------- |
| `getByRole('button', { name: /Open user menu/ })` | user menu popover | profile / settings / logout entries          |

## Network calls expected during normal use

| trigger       | method | path                    | what request body or query is expected          |
| ------------- | ------ | ----------------------- | ----------------------------------------------- |
| initial mount | GET    | /api/dashboard/summary  | KPI numbers (cash collected, outstanding, etc.) |
| initial mount | GET    | /api/dashboard/activity | array of recent activity items                  |
| initial mount | GET    | /api/invoices           | array of invoice rows for recent-list card      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
