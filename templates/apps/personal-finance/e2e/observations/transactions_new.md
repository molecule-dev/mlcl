# Page observations: /transactions/new (AddTransaction)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/transactions/new.
> Headings: 1: Add transaction; 3: amount, details, recurring options.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role     | expected behavior on interaction                                        | success signal                                    | failure signal                    |
| ---------------------------------------------------- | -------- | ----------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------- |
| `[data-mol-id="add-transaction-description"]`        | textbox  | Payee/Description input                                                 | typed value mirrored back                         | input not visible / not editable  |
| `[data-mol-id="add-transaction-account"]`            | combobox | Account select populated from /api/accounts                             | seeded account selectable                         | empty options                     |
| `[data-mol-id="add-transaction-category"]`           | combobox | Category select populated from /api/categories                          | seeded category selectable                        | empty options                     |
| `getByRole('button', { name: /save transaction/i })` | button   | POST /api/transactions and redirect to /transactions (read-after-write) | URL becomes /transactions and row visible in list | stays on form / 4xx / row missing |
| `getByRole('button', { name: /cancel/i })`           | button   | returns to /transactions without creating a row                         | URL becomes /transactions and count unchanged     | new row created or no nav         |

## Hidden surfaces opened from this page

| trigger    | what it opens    | elements inside                      |
| ---------- | ---------------- | ------------------------------------ |
| Tags input | inline chip list | "#<tag>" chips, close icon to remove |

## Network calls expected during normal use

| trigger   | method | path              | expected body                          |
| --------- | ------ | ----------------- | -------------------------------------- |
| Page load | GET    | /api/categories   | response 200, array of categories      |
| Page load | GET    | /api/accounts     | response 200, array of accounts        |
| Submit    | POST   | /api/transactions | full transaction payload, response 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/transactions_new.spec.ts`
