# Page observations: /reports (ReportsPage)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/reports.
> Headings: 1: Reports; 3: spending-by-category, income-vs-expenses, net-worth, budget-progress.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role    | expected behavior on interaction         | success signal      | failure signal         |
| -------------------------------------------- | ------- | ---------------------------------------- | ------------------- | ---------------------- |
| `getByRole('heading', { name: /reports/i })` | heading | renders the page title                   | heading visible     | nothing rendered / 401 |
| `[data-mol-id="tab-1m"]`                     | button  | filters reports to the last month        | active state on 1m  | filter does nothing    |
| `[data-mol-id="tab-3m"]`                     | button  | filters reports to the last three months | active state on 3m  | filter does nothing    |
| `[data-mol-id="tab-6m"]`                     | button  | filters reports to the last six months   | active state on 6m  | filter does nothing    |
| `[data-mol-id="tab-ytd"]`                    | button  | filters reports year-to-date             | active state on ytd | filter does nothing    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                              | expected body                  |
| --------- | ------ | --------------------------------- | ------------------------------ |
| Page load | GET    | /api/reports/spending-by-category | response 200, breakdown array  |
| Page load | GET    | /api/reports/income-vs-expenses   | response 200, totals object    |
| Page load | GET    | /api/reports/net-worth            | response 200, snapshot object  |
| Page load | GET    | /api/reports/budget-progress      | response 200, per-budget array |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
