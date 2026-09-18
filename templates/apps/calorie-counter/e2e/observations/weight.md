# Page observations: /weight (WeightTracking)

Source: live walk via Playwright + e2e/weight.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name | role       | expected behavior on interaction                           | success signal                 | failure signal              |
| -------------------------- | ---------- | ---------------------------------------------------------- | ------------------------------ | --------------------------- |
| Unit toggle (lb/kg)        | button     | changes display unit and refetches                         | displayed values switch units  | no change                   |
| "Log weight" toggle        | button     | opens inline form                                          | numeric input visible          | no form                     |
| Weight number input        | spinbutton | accepts a numeric weight                                   | value reflects typed text      | value empty                 |
| Save submit                | button     | POST /api/weight (kg-converted); new entry visible in list | GET /api/weight reflects entry | no entry created            |
| Entries list               | list       | shows past logs with date + delta or empty state           | either rows or empty text      | page blank                  |
| Trend SVG chart            | figure     | renders polyline once ≥2 entries exist                     | svg present                    | svg missing despite ≥2 logs |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                 | method | path                 | what request body or query is expected |
| ----------------------- | ------ | -------------------- | -------------------------------------- |
| Page load + unit change | GET    | /api/weight?limit=12 | array of WeightLog                     |
| Submit weight           | POST   | /api/weight          | { weight_kg } → 201                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/weight.spec.ts`
