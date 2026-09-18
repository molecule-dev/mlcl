# Page observations: /transactions/:id (TransactionDetail)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/transactions/<id>.
> Headings: transaction header, details, similar transactions, location.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                       | role   | expected behavior on interaction                       | success signal                                                         | failure signal                         |
| ---------------------------------------------------------------- | ------ | ------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------- |
| `getByText(<transaction description>)`                           | text   | renders the transaction header (description + amount)  | seeded description visible                                             | "Transaction not found" shown          |
| `getByText(/Transaction not found/i)`                            | text   | unknown transaction id surfaces friendly error         | error + Back to Transactions CTA visible                               | blank screen / 500                     |
| `getByRole('link', { name: /back to transactions/i })`           | link   | not-found CTA returns user to /transactions            | URL becomes /transactions                                              | stays on detail                        |
| `getByRole('button', { name: /delete/i })` then `/yes, delete/i` | button | DELETE /api/transactions/:id and redirect              | URL returns to /transactions and GET /api/transactions/:id returns 404 | row still present                      |
| `getByText(<sibling transaction description>)`                   | text   | similar transactions card lists same-category siblings | sibling description visible                                            | similar card empty when siblings exist |

## Hidden surfaces opened from this page

| trigger       | what it opens             | elements inside                     |
| ------------- | ------------------------- | ----------------------------------- |
| Delete button | inline delete-confirm bar | Cancel button, "Yes, Delete" button |

## Network calls expected during normal use

| trigger        | method | path                                       | expected body                      |
| -------------- | ------ | ------------------------------------------ | ---------------------------------- |
| Page load      | GET    | /api/transactions/:id                      | response 200, transaction object   |
| Page load      | GET    | /api/transactions?category_id=:cat&limit=5 | response 200, similar transactions |
| Confirm delete | DELETE | /api/transactions/:id                      | response 200/204                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/transactions__id.spec.ts`
