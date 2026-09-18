# Page observations: /food/:id (FoodDetail)

Source: live walk via Playwright + e2e/food__id.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name        | role       | expected behavior on interaction                  | success signal                   | failure signal     |
| --------------------------------- | ---------- | ------------------------------------------------- | -------------------------------- | ------------------ |
| Hero name + brand area            | figure     | renders food.name + brand from GET /api/foods/:id | heading visible                  | unavailable banner |
| Servings number input             | spinbutton | updating multiplies calories/macros displayed     | displayed kcal scales with input | no scaling         |
| Add to (Breakfast                 | Lunch      | Dinner                                            | Snacks) buttons                  | button             | POST /api/diary; success banner shown | success banner role=status | error banner |
| "Add to diary" button (top right) | button     | POST /api/diary defaulting to lunch               | diary entry created              | no diary entry     |
| Back to results link              | button     | history.back() to /log                            | URL becomes /log                 | navigation fails   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected |
| --------- | ------ | -------------- | -------------------------------------- |
| Page load | GET    | /api/foods/:id | 200 with food details                  |
| Click Add | POST   | /api/diary     | entry payload → 201                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/food__id.spec.ts`
