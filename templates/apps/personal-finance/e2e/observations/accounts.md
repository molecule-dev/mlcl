# Page observations: /accounts (AccountsPage)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/accounts.
> Headings observed: 1: Accounts; 3: Add account, balance summary, account list.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role     | expected behavior on interaction            | success signal                      | failure signal                         |
| ------------------------------------------------------ | -------- | ------------------------------------------- | ----------------------------------- | -------------------------------------- |
| `getByRole('heading', { name: /accounts/i })`          | heading  | renders "Accounts" page title               | heading visible after navigation    | nothing rendered / 401 redirect        |
| `getByRole('link', { name: /add account/i })`          | link     | routes to /accounts/new                     | URL becomes /accounts/new           | no navigation                          |
| `[data-mol-id="account-row"]` (one per seeded account) | listitem | renders the account row with name + balance | seeded account name visible in list | empty list shown though account exists |
| `getByRole('link', { name: <account name> })`          | link     | routes to /accounts/:id                     | URL becomes /accounts/<id>          | no navigation                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path          | expected body                   |
| --------- | ------ | ------------- | ------------------------------- |
| Page load | GET    | /api/accounts | response 200, array of accounts |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/accounts.spec.ts`
