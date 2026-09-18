# Page observations: /recipes/:id (RecipeDetail)

Source: live walk via Playwright + e2e/recipes__id.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name       | role   | expected behavior on interaction                           | success signal                       | failure signal     |
| -------------------------------- | ------ | ---------------------------------------------------------- | ------------------------------------ | ------------------ |
| Hero card with name + total kcal | figure | renders meal.name + Math.round(total_calories)             | totals render                        | unavailable banner |
| "Log to today" button            | button | POST /api/diary with food_name = meal.name; success banner | diary entry created with recipe name | error banner       |
| Back to recipes link             | button | navigates to /recipes                                      | URL becomes /recipes                 | no nav             |
| Ingredients list                 | list   | renders meal.items rows or "No ingredients" text           | either rows or empty text            | page blank         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path           | what request body or query is expected |
| ------------------ | ------ | -------------- | -------------------------------------- |
| Page load          | GET    | /api/meals/:id | 200 with meal + items                  |
| Click Log to today | POST   | /api/diary     | recipe payload → 201                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/recipes__id.spec.ts`
