# Page observations: /budgets (BudgetsPage)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/budgets.
> Headings: 1: Budgets; 3: monthly summary, budget cards.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role     | expected behavior on interaction    | success signal           | failure signal         |
| ----------------------------------------------------- | -------- | ----------------------------------- | ------------------------ | ---------------------- |
| `getByRole('heading', { name: /budgets/i })`          | heading  | renders the page title              | heading visible          | nothing rendered / 401 |
| `getByRole('link', { name: /add budget/i })`          | link     | routes to /budgets/new              | URL becomes /budgets/new | no navigation          |
| `[data-mol-id="budget-card"]` (one per seeded budget) | listitem | shows category name + monthly limit | seeded budget visible    | list empty after seed  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path         | expected body                  |
| --------- | ------ | ------------ | ------------------------------ |
| Page load | GET    | /api/budgets | response 200, array of budgets |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/budgets.spec.ts`
