# Page observations: /history (History)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role      | expected behavior on interaction                           | success signal                | failure signal |
| ------------------------------------------------------------------- | --------- | ---------------------------------------------------------- | ----------------------------- | -------------- |
| `getByRole('heading', { level: 1 })`                                | heading   | renders "History" h1                                       | h1 visible                    | h1 missing     |
| `[data-testid="history-list"]` or `[data-testid="history-loading"]` | list/text | renders the history list OR a loading state OR empty state | one is visible                | none visible   |
| `[data-testid="history-row-${id}"]` (any)                           | listitem  | renders one row per qa entry                               | row count > 0 once data loads | no rows        |
| `[data-testid="history-question"]` (any)                            | text      | renders the question text inside a row                     | text visible                  | text missing   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path            | what request body or query is expected |
| ------- | ------ | --------------- | -------------------------------------- |
| mount   | GET    | /api/qa/history | scoped to current user                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/history.spec.ts`
