# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role                      | expected behavior on interaction                   | success signal                                | failure signal                          |
| -------------------------------------------------------- | ------------------------- | -------------------------------------------------- | --------------------------------------------- | --------------------------------------- |
| `page.locator('[data-mol-id="dashboard-circuits"]')`     | region                    | lists seeded circuits with name + watt + kWh today | visible; one of seeded meter names appears    | empty / missing                         |
| `page.locator('[data-mol-id="dashboard-empty"]')`        | region                    | NOT shown when 3 demo meters are seeded            | count=0                                       | empty state visible despite seeded data |
| `getByRole('link', { name: /manage alerts/i }).first()`  | link                      | navigates to /alerts                               | URL becomes /alerts                           | URL unchanged                           |
| `getByRole('link', { name: /every device                 | all devices/i }).first()` | link                                               | navigates to /devices                         | URL becomes /devices                    | URL unchanged |
| `getByRole('button', { name: /toggle theme/i }).first()` | button                    | flips data-mol-mode and persists across reload     | data-mol-mode toggled; survives page.reload() | mode unchanged or not persisted         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger      | method | path                    | what request body or query is expected                  |
| ------------ | ------ | ----------------------- | ------------------------------------------------------- |
| initial load | GET    | /api/readings/summary   | returns { totalKwh, solarKwh, gridKwh, costUsd }        |
| initial load | GET    | /api/readings/circuits  | array of seeded meters with current_w + kwh_today       |
| initial load | GET    | /api/costs/calculate    | query: start_date, end_date — returns daily cost rollup |
| initial load | GET    | /api/alerts?status=open | returns currently-open alerts (empty for fresh user)    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
