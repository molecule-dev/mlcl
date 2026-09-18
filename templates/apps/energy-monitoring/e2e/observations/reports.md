# Page observations: /reports (Reports)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role   | expected behavior on interaction                                            | success signal                                  | failure signal            |
| -------------------------------------------------------- | ------ | --------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------- |
| `page.locator('table').first()`                          | table  | renders daily-breakdown rows for the selected range                         | rows visible with date + kWh + cost columns     | empty or missing table    |
| `page.locator('[data-mol-id^="reports-range-"]')`        | button | range chips (7D/30D/90D/1Y) refetch /api/readings/daily with tighter window | PATCH/GET re-fires with new start_date param    | no refetch or 4xx         |
| `getByRole('button', { name: /download csv/i }).first()` | button | triggers a CSV file download                                                | browser download event fired with text/csv body | no download or wrong mime |
| `page.locator('main')`                                   | region | renders KPI tiles with $ and kWh totals for the range                       | main contains both `$` and `kWh` substrings     | placeholders ("—") shown  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger            | method | path                                        | what request body or query is expected                            |
| ------------------ | ------ | ------------------------------------------- | ----------------------------------------------------------------- |
| initial load       | GET    | /api/readings/daily                         | array of `{ date, kwh, cost }`                                    |
| range chip click   | GET    | /api/readings/daily?start_date=…&end_date=… | narrower window of daily aggregates                               |
| download CSV click | GET    | /api/readings/daily?format=csv              | text/csv response (or client-side CSV from the cached daily rows) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
