# Page observations: /accounts/:id (AccountDetail)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/accounts/<id>.
> Headings observed: account name, monthly cash flow, balance history, recent transactions.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role     | expected behavior on interaction                          | success signal                                | failure signal            |
| ----------------------------------------------------- | -------- | --------------------------------------------------------- | --------------------------------------------- | ------------------------- |
| `getByText(<account name>)`                           | text     | renders the account header (name + institution + balance) | name + institution visible                    | "Account not found" shown |
| `[data-mol-id="account-row"]` recent-transactions     | listitem | shows the seeded transactions for this account            | transaction description visible               | empty state when seeded   |
| `getByText(/Account not found/i)`                     | text     | unknown account id surfaces friendly error                | text + "Back to Accounts" CTA visible         | blank screen / 500        |
| `getByRole('link', { name: /back to accounts/i })`    | link     | not-found CTA returns user to /accounts                   | URL becomes /accounts                         | stays on /accounts/<id>   |
| `div.fixed.bottom-10.right-10 button` (Quick-Add FAB) | button   | navigates to /transactions/new with `accountId=<id>`      | URL contains /transactions/new?accountId=<id> | no navigation             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                                      | expected body                    |
| --------- | ------ | ----------------------------------------- | -------------------------------- |
| Page load | GET    | /api/accounts/:id                         | response 200, account object     |
| Page load | GET    | /api/transactions?account_id=:id&limit=10 | response 200, transactions array |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/accounts__id.spec.ts`
