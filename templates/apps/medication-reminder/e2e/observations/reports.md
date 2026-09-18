# Page observations: /reports (AdherenceReport)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role    | expected behavior on interaction                   | success signal                | failure signal               |
| --------------------------------------------- | ------- | -------------------------------------------------- | ----------------------------- | ---------------------------- |
| Adherence heading                             | heading | renders "Adherence report" heading                 | visible                       | absent                       |
| Adherence / Streak / Taken / Missed KPI tiles | group   | reflect `GET /api/reports/adherence` numbers       | values match server           | always 0%                    |
| Daily-30d bar chart                           | group   | renders 30 day bars from daily_30d response        | 30 bar elements rendered      | empty container              |
| By-medication bar list                        | list    | renders one row per medication with adherence_rate | seeded medication row visible | empty list after seeded data |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger    | method | path                   | what request body or query is expected |
| ---------- | ------ | ---------------------- | -------------------------------------- |
| Page mount | GET    | /api/reports/adherence | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
