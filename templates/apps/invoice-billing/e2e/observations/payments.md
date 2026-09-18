# Page observations: /payments (Payments)

> Cash-flow ledger showing collected/pending/failed totals + a per-row
> payment history with method icon, reference, amount, status. CSV
> export hits `/api/exports/payments.csv` — free tier returns 402.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction                                | success signal                                  | failure signal |
| ---------------------------------------------- | ------- | --------------------------------------------------------------- | ----------------------------------------------- | -------------- |
| `getByRole('heading', { name: /^Payments$/ })` | heading | static title                                                    | visible                                         | missing        |
| `getByText(/Payment history/)`                 | heading | populated table from `GET /api/payments`                        | at least one payment row from demo seed visible | empty + error  |
| `getByText(/Collected/)`                       | text    | KPI from sum of `status='completed'` payments                   | currency value visible (not `$NaN`)             | "$NaN"         |
| `getByText(/Pending/)`                         | text    | KPI from sum of `status='pending'` payments                     | currency value visible                          | "$NaN"         |
| `getByText(/Failed/)`                          | text    | KPI from sum of `status='failed'` payments                      | currency value visible                          | "$NaN"         |
| `getByRole('button', { name: /Export CSV/ })`  | button  | hits `/api/exports/payments.csv`; free tier shows upgrade error | error visible OR file downloads (paid)          | no response    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger           | method | path                      | what request body or query is expected |
| ----------------- | ------ | ------------------------- | -------------------------------------- |
| initial mount     | GET    | /api/payments             | array of payment rows                  |
| Export CSV (free) | GET    | /api/exports/payments.csv | 402 with upgrade message               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/payments.spec.ts`
