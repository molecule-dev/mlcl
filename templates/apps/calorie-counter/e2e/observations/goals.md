# Page observations: /goals (Goals)

Source: live walk via Playwright + e2e/goals.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name                              | role       | expected behavior on interaction                               | success signal                          | failure signal  |
| ------------------------------------------------------- | ---------- | -------------------------------------------------------------- | --------------------------------------- | --------------- |
| Calorie display + range slider                          | slider     | sliding then onMouseUp triggers POST /api/goals (release-only) | GET /api/goals returns updated calories | no POST fired   |
| Lower button                                            | button     | POST /api/goals decreases calories by ~2.5%                    | calories goes down + persists           | no change       |
| Raise button                                            | button     | POST /api/goals increases calories by ~2.5%                    | calories goes up + persists             | no change       |
| Activity level (Sedentary/Light/Active/Active+) buttons | button     | sets activity + POSTs goals.calories with multiplier           | pressed style + POST captured           | no POST         |
| Macro tune buttons (Protein/Carbs/Fat/Fiber)            | button     | opens inline numeric editor                                    | input becomes editable                  | no editor opens |
| Macro inline edit (Enter)                               | spinbutton | commits new value → POST /api/goals                            | goals.protein (or other) persisted      | no POST         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger          | method | path       | what request body or query is expected         |
| ---------------- | ------ | ---------- | ---------------------------------------------- |
| Page load        | GET    | /api/goals | 200 with current goals                         |
| Raise/Lower/edit | POST   | /api/goals | { calories, protein, carbs, fat, fiber } → 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/goals.spec.ts`
