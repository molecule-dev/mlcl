# Page observations: /reports (Reports)

> Tax-ready reports dashboard. Initial load fires five GETs in parallel:
> `/api/reports/revenue`, `/api/reports/aging`, `/api/reports/top-clients`,
> `/api/reports/payment-methods`, and `/api/clients` (for label lookup).
> Period chips (monthly/quarterly/annual) refetch revenue with a different
> date window. CSV export hits `/api/exports/invoices.csv`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                | success signal                                      | failure signal |
| ----------------------------------------------------- | ------- | ----------------------------------------------- | --------------------------------------------------- | -------------- |
| `getByRole('heading', { name: /^Reports$/ })`         | heading | static title                                    | visible                                             | missing        |
| `getByText(/Revenue YTD/)`                            | text    | KPI computed from revenue series                | currency value visible                              | "$NaN"         |
| `getByText(/Outstanding/)` (KPI)                      | text    | sum of aging buckets                            | currency value                                      | "$NaN"         |
| `getByRole('button', { name: /^monthly$/ })` (period) | button  | refetches revenue with monthly window           | `GET /api/reports/revenue?...` fires                | no refetch     |
| `getByRole('button', { name: /^quarterly$/ })`        | button  | refetches with wider window                     | new `GET /api/reports/revenue` fires                | no refetch     |
| `getByRole('button', { name: /^annual$/ })`           | button  | refetches with wider window                     | new `GET /api/reports/revenue` fires                | no refetch     |
| `getByRole('button', { name: /Export CSV/ })`         | button  | hits `/api/exports/invoices.csv`; free tier 402 | error or download                                   | no-op          |
| `getByText(/Revenue overview/)`                       | heading | revenue area chart with SVG path                | `<svg>` rendered with `<path>` non-empty d          | empty          |
| `getByText(/Invoice aging/)`                          | heading | aging bar chart per status bucket               | bars rendered for at least one bucket               | empty/error    |
| `getByText(/Top clients/)`                            | heading | ordered top-5 client list                       | at least one client name with revenue value         | empty section  |
| `getByText(/Payment methods/)`                        | heading | breakdown donut + legend                        | percentages render or "No payment data" empty state | "$NaN"         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger           | method | path                                         | what request body or query is expected                    |
| ----------------- | ------ | -------------------------------------------- | --------------------------------------------------------- |
| initial mount     | GET    | /api/reports/revenue?start_date=…&end_date=… | array of `{ bucket, total_amount }`                       |
| initial mount     | GET    | /api/reports/aging                           | array of `{ status, total_outstanding, invoice_count }`   |
| initial mount     | GET    | /api/reports/top-clients                     | array of `{ client_id, lifetime_revenue, invoice_count }` |
| initial mount     | GET    | /api/reports/payment-methods                 | array of `{ method, total_amount }`                       |
| initial mount     | GET    | /api/clients                                 | array used to look up client_id → name                    |
| Period chip click | GET    | /api/reports/revenue?...                     | fires again with wider/narrower window                    |
| Export CSV (free) | GET    | /api/exports/invoices.csv                    | 402                                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
