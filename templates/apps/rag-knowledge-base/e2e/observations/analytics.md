# Page observations: /analytics (Analytics)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                             | role                  | expected behavior on interaction               | success signal                        | failure signal  |
| -------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------- | ------------------------------------- | --------------- |
| `getByRole('heading', { level: 1 })`                                                   | heading               | renders "Retrieval analytics" h1               | h1 visible                            | h1 missing      |
| `getByText(/total queries/i)`                                                          | text                  | renders the total queries metric tile          | text visible                          | text missing    |
| `getByText(/avg relevance                                                              | relevance/i).first()` | text                                           | renders the avg relevance metric tile | text visible    | text missing |
| `[data-testid="analytics-topdocs"]` or `[data-testid="analytics-topdocs-empty"]`       | list/text             | renders the top-cited-docs list OR empty state | one of the two is visible             | neither visible |
| `[data-testid="analytics-topqueries"]` or `[data-testid="analytics-topqueries-empty"]` | list/text             | renders the top-queries list OR empty state    | one of the two is visible             | neither visible |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                   | what request body or query is expected |
| ------- | ------ | ---------------------- | -------------------------------------- |
| mount   | GET    | /api/reports/analytics | scoped to current user                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/analytics.spec.ts`
