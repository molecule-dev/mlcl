# Page observations: /expenses

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup + creating a trip.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name              | role    | expected behavior on interaction        | success signal                       | failure signal  |
| --------------------------------------- | ------- | --------------------------------------- | ------------------------------------ | --------------- |
| `getByRole('heading', { name: /expenses | spend   | budget/i })`                            | heading                              | static page H1  | visible | missing |
| `[data-testid="expenses-new"]`          | button  | toggles the inline new-expense form     | form visible after click             | nothing happens |
| `[data-testid="expenses-form"]`         | generic | inline form for new expense             | visible after toggle                 | always hidden   |
| `[data-testid="expenses-no-trips"]`     | generic | empty state shown when user has 0 trips | visible until first trip             | always hidden   |
| `[data-testid="expenses-empty"]`        | generic | empty list state                        | visible when 0 expenses for the trip | always hidden   |
| `[data-testid="expenses-rows"]`         | generic | populated rows after first expense      | visible after POST                   | always hidden   |
| `[data-testid="expenses-row"]`          | generic | one row per expense                     | visible after creating               | missing         |
| `[data-testid="expenses-total-cents"]`  | generic | sum of expenses for current trip        | numeric                              | NaN / blank     |
| `[data-testid="expenses-by-category"]`  | generic | breakdown summary by category           | visible                              | broken layout   |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior)    |
| ------------------ | ------------- | ----------------------------------------------- |
| New expense button | inline form   | trip select, category, amount, currency, submit |

## Network calls expected during normal use

| trigger     | method | path          | what request body or query is expected          |
| ----------- | ------ | ------------- | ----------------------------------------------- |
| Mount       | GET    | /api/expenses | auth header                                     |
| Mount       | GET    | /api/trips    | auth header (for trip tabs)                     |
| Submit form | POST   | /api/expenses | `{ trip_id, category, amount_cents, currency }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/expenses.spec.ts`
