# Page observations: /dashboard (Dashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name         | role      | expected behavior on interaction                          | success signal            | failure signal          |
| ---------------------------------- | --------- | --------------------------------------------------------- | ------------------------- | ----------------------- |
| `[data-test=dashboard-page]` shell | container | renders KPI grid + sections                               | visible after seed        | empty / loading forever |
| KPI: Watching count                | metric    | reflects watchlist length                                 | number = watchlist.length | mismatch / missing      |
| KPI: Drops this week               | metric    | reflects drops in trends/drops                            | number from API           | mismatch                |
| KPI: Lifetime savings              | metric    | sum of (list - best) over watchlist                       | dollars rendered          | mismatch                |
| KPI: Expiring alerts               | metric    | active alerts whose target_price is close                 | number from API           | mismatch                |
| Trending products grid             | grid      | populates from /prices/trends/drops or watchlist fallback | ≥1 card                   | empty when seeded       |
| Recent activity feed               | list      | shows recent notifications                                | ≥1 row                    | empty when seeded       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                     | what request body or query is expected |
| --------- | ------ | ------------------------ | -------------------------------------- |
| page load | GET    | /api/watchlist           | auth header only                       |
| page load | GET    | /api/alerts              | auth header only                       |
| page load | GET    | /api/prices/trends/drops | auth header only                       |
| page load | GET    | /api/notifications       | auth header only                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
