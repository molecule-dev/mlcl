# Page observations: /stats (Stats)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role    | expected behavior on interaction             | success signal           | failure signal        |
| ----------------------------------------------------------------- | ------- | -------------------------------------------- | ------------------------ | --------------------- |
| `getByRole("heading", { name: /^Stats$/i, level: 1 })`            | heading | renders Stats h1                             | visible h1               | missing heading       |
| KPI tiles for Reviews(30d), Current streak, Retention, Daily avg  | list    | render values from /api/reports/overview     | all 4 KPI labels visible | empty / loading stuck |
| reviews-per-day mini bar chart `[data-mol-id="stats-daily-bars"]` | img     | render 30 bars (one per day, even if zero)   | 30 bar children rendered | no bars rendered      |
| cards-by-state list `[data-mol-id="stats-by-state"]`              | list    | render new/learning/review/relearning counts | list with 4 items        | empty                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                  | what request body or query is expected                |
| ----------- | ------ | --------------------- | ----------------------------------------------------- |
| load /stats | GET    | /api/reports/overview | overview payload (totals/by_state/daily_reviews/etc.) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
