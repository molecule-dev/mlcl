# Page observations: /analytics (Analytics)

Source: live walk via Playwright + e2e/analytics.spec.ts. Each row maps
to an interactive element exercised by a passing test that asserts on
real outcomes (network call, query param change, real CSV download).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                          | role           | expected behavior on interaction                                                                       | success signal                                              | failure signal         |
| ----------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------- |
| `getByRole('heading', { name: /analytics/i, level: 1 })` + summary/volume API calls | heading + load | initial load fires `/api/moderation/stats/summary` and `…/volume`                                      | both 200, heading visible                                   | 4xx/5xx, alert visible |
| `getByRole('button', { name: /last 24h\|7 days\|30 days\|90 days/i })`              | button group   | click each button → `?range=24h\|7d\|30d\|90d` and the corresponding button gets `[aria-pressed=true]` | URL updates per range                                       | URL unchanged          |
| `getByRole('button', { name: /export csv/i })`                                      | button         | downloads `analytics-<range>.csv` with non-empty body                                                  | `page.waitForEvent('download')` resolves and file >10 bytes | timeout, blank file    |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — single page, no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                          | what request body or query is expected               |
| ------------ | ------ | ----------------------------- | ---------------------------------------------------- |
| initial load | GET    | /api/moderation/stats/summary | 200 with KPI summary object                          |
| initial load | GET    | /api/moderation/stats/volume  | 200 with `{series:[{date,label,value,height}], max}` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/analytics.spec.ts`
