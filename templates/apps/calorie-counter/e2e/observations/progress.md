# Page observations: /progress (Progress)

Source: live walk via Playwright + e2e/progress.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name                 | role   | expected behavior on interaction                                        | success signal                                    | failure signal |
| ------------------------------------------ | ------ | ----------------------------------------------------------------------- | ------------------------------------------------- | -------------- |
| Period segmented control (Week/Month/Year) | button | switches period; refetches /api/nutrition/daily-averages with new range | GET /api/nutrition/daily-averages with date range | no refetch     |
| Avg daily kcal stat card                   | figure | shows averages.calories from API                                        | tabular numeric value                             | NaN            |
| Day streak stat card                       | figure | shows current_streak from /api/nutrition/streak                         | integer value                                     | missing        |
| Days at goal stat card                     | figure | shows count of days within ±10% of goal                                 | fraction "n/total"                                | missing        |
| Calories-by-day chart                      | figure | renders bars for each day in range or empty state                       | either bars OR empty text                         | page broken    |
| Macro split list (Protein/Carbs/Fat %)     | list   | three rows showing kcal-share %                                         | three rows render                                 | rows missing   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                   | method | path                          | what request body or query is expected |
| ------------------------- | ------ | ----------------------------- | -------------------------------------- |
| Page load + period change | GET    | /api/nutrition/daily-averages | start_date+end_date query              |
| Page load                 | GET    | /api/nutrition/streak         | 200 with current_streak                |
| Page load                 | GET    | /api/goals                    | 200 with calorie target                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/progress.spec.ts`
