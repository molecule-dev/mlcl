# Page observations: /insights (Insights)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role      | expected behavior on interaction         | success signal                             | failure signal      |
| --------------------------------------------------------- | --------- | ---------------------------------------- | ------------------------------------------ | ------------------- |
| `getByRole('heading', { name: /^Insights$/i, level: 1 })` | heading   | renders page title                       | heading visible                            | absent              |
| 4 DORA KPI tiles (Deploys/day, Lead time, CFR, MTTR)      | KPI tiles | shows DORA metrics                       | all 4 labels + numerics visible            | label/value missing |
| 14-day pipeline success rate chart                        | chart     | renders 14 daily bars from /api/insights | exactly 14 `div[title^="YYYY-MM-DD"]` bars | wrong bar count     |
| Slowest pipeline steps section                            | section   | shows top-N slowest pipeline steps       | heading + ≥1 step row visible              | empty               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected |
| --------- | ------ | ------------- | -------------------------------------- |
| Page load | GET    | /api/insights | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/insights.spec.ts`
