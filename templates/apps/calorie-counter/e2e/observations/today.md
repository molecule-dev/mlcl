# Page observations: /today (Today)

Source: live walk via Playwright + e2e/today.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name         | role   | expected behavior on interaction                                | success signal                 | failure signal        |
| ---------------------------------- | ------ | --------------------------------------------------------------- | ------------------------------ | --------------------- |
| `[data-testid="water-add-button"]` | button | POST /api/diary/quick-add for water; updates water-count        | water-count text changes       | water-count unchanged |
| `[data-testid="water-count"]`      | text   | shows current/goal (e.g. "0 / 6") and increments after add      | count increases by 1 after add | no change             |
| Quick-add Snack button             | button | POST /api/diary/quick-add for snack (calories: 100)             | diary entries length grows     | no change             |
| Quick-add Coffee button            | button | POST /api/diary/quick-add for coffee                            | diary entries length grows     | no change             |
| Add food link                      | link   | navigates to /log                                               | URL becomes /log               | navigation fails      |
| Calorie ring card                  | figure | shows consumed vs goal kcal pulled from /api/diary + /api/goals | numeric values render          | NaN or empty          |
| Macros card (Protein/Carbs/Fat)    | list   | three macros render with current/goal grams                     | three rows render              | rows missing          |
| Streak card                        | figure | displays current_streak from /api/nutrition/streak              | integer day count visible      | NaN / missing         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected                       |
| ----------- | ------ | -------------------------- | ------------------------------------------------------------ |
| Page load   | GET    | /api/diary?date=YYYY-MM-DD | 200 with entries + totals                                    |
| Page load   | GET    | /api/goals                 | 200 with calorie + macro targets                             |
| Page load   | GET    | /api/nutrition/streak      | 200 with current_streak                                      |
| Click water | POST   | /api/diary/quick-add       | { date, meal_type:snack, calories:0, food_name:Water } → 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/today.spec.ts`
