# Page observations: /recipes (Recipes)

Source: live walk via Playwright + e2e/recipes.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction                                     | success signal                                      | failure signal |
| -------------------------- | ------- | -------------------------------------------------------------------- | --------------------------------------------------- | -------------- |
| "New recipe" button        | button  | toggles inline create form                                           | name input visible                                  | no form        |
| Name input                 | textbox | accepts recipe name                                                  | value reflects typed text                           | value empty    |
| Create recipe submit       | button  | POST /api/meals; new recipe appears in grid + persists across reload | recipe present in /api/meals + visible after reload | recipe missing |
| Recipe card                | button  | navigates to /recipes/:id                                            | URL becomes /recipes/<id>                           | no nav         |
| "Add another recipe" tile  | link    | re-opens new-recipe form                                             | name input visible                                  | no form        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected |
| ----------- | ------ | ---------- | -------------------------------------- |
| Page load   | GET    | /api/meals | 200 with array                         |
| Submit form | POST   | /api/meals | { name, items[] } → 201                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/recipes.spec.ts`
