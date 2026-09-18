# Page observations: /log (LogFood)

Source: live walk via Playwright + e2e/log.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                       | success signal                      | failure signal                |
| ------------------------------------------------------ | ------- | ------------------------------------------------------ | ----------------------------------- | ----------------------------- |
| Search input                                           | textbox | debounced search → GET /api/foods?q=...                | food list narrows                   | list unchanged                |
| Verified tab                                           | button  | GET /api/foods?is_verified=true                        | list filters to verified            | no refetch                    |
| My foods tab                                           | button  | GET /api/foods?is_verified=false                       | list filters to user foods          | no refetch                    |
| Meal segmented control (Breakfast/Lunch/Dinner/Snacks) | button  | changes target meal_type for adds                      | active button highlighted           | no highlight change           |
| Add (+) on a food row                                  | button  | POST /api/diary then GET /api/diary reflects new entry | diary entries grow + success banner | remains on /log with no entry |
| Quick-Add Water button                                 | button  | POST /api/diary/quick-add                              | success banner role=status          | no banner / error             |
| Recent today list                                      | list    | shows last 5 today entries; empty state when none      | either rows or empty text           | list missing                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path                 | what request body or query is expected                                       |
| ------------------ | ------ | -------------------- | ---------------------------------------------------------------------------- |
| Page load + filter | GET    | /api/foods           | q + is_verified + limit query → array                                        |
| Page load          | GET    | /api/diary?date=…    | recent items                                                                 |
| Click +            | POST   | /api/diary           | { date, meal_type, food_id, food_name, calories, protein, carbs, fat } → 201 |
| Click Quick Add    | POST   | /api/diary/quick-add | quick-add payload → 201                                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/log.spec.ts`
