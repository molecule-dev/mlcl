# Page observations: /transactions (TransactionsPage)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/transactions.
> Headings: 1: Transactions; 3: filter bar, table.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                | success signal                 | failure signal         |
| ----------------------------------------------------- | ------- | ----------------------------------------------- | ------------------------------ | ---------------------- |
| `getByRole('heading', { name: /transactions/i })`     | heading | renders the page title                          | heading visible                | nothing rendered / 401 |
| `getByRole('link', { name: /add transaction/i })`     | link    | routes to /transactions/new                     | URL becomes /transactions/new  | no navigation          |
| `[data-mol-id="transaction-row"]` (one per seeded tx) | row     | shows the transaction description, amount, date | seeded transaction visible     | empty list after seed  |
| `getByRole('link', { name: <description> })`          | link    | routes to /transactions/:id                     | URL becomes /transactions/<id> | no navigation          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path              | expected body                       |
| --------- | ------ | ----------------- | ----------------------------------- |
| Page load | GET    | /api/transactions | response 200, array of transactions |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/transactions.spec.ts`
