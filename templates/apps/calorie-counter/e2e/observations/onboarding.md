# Page observations: /onboarding (Onboarding)

Source: live walk via Playwright + e2e/onboarding.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name                                    | role     | expected behavior on interaction             | success signal                                    | failure signal                         |
| ------------------------------------------------------------- | -------- | -------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| `getByRole("button", { name: /continue/i })` step 1 (welcome) | button   | advances to "What's your goal?" step         | goal heading visible                              | still on welcome step                  |
| `getByRole("button", { name: /lose                            | maintain | gain/i })`                                   | button                                            | selects goal and applies primary style | aria-pressed/style change   | no selection state        |
| `getByRole("button", { name: /sedentary                       | lightly  | active                                       | very/i })`                                        | button                                 | selects activity multiplier | aria-pressed/style change | no selection state |
| `[data-testid="onboarding-finish"]`                           | button   | POST /api/goals + navigate to /today         | URL becomes /today; GET /api/goals returns target | remains on /onboarding                 |
| `[data-testid="onboarding-calories"]`                         | text     | shows computed calorie target on macros step | numeric value > 1500 visible                      | value missing or 0                     |
| `getByRole("button", { name: /back/i })`                      | button   | goes back one step (disabled on first)       | previous step heading visible                     | still on current step                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                         | method | path       | what request body or query is expected                        |
| ------------------------------- | ------ | ---------- | ------------------------------------------------------------- |
| Click "Let's go" on macros step | POST   | /api/goals | { calories, protein, carbs, fat, fiber, sodium, sugar } → 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/onboarding.spec.ts`
