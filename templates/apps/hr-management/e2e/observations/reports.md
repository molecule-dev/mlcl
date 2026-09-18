# Page observations: /reports (Reports)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/reports.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/reports`.
2. `browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                             | success signal                        | failure signal           |
| --------------------------------------------------- | ------- | ------------------------------------------------------------ | ------------------------------------- | ------------------------ |
| KPI cards (Headcount / Turnover / Promotions / PTO) | view    | render all four KPI cards from /api/dashboard-stats          | every card visible with numeric value | "Failed to load"         |
| Headcount API endpoint                              | request | GET /api/reports/headcount returns total + active counts     | total ≥ seeded headcount              | non-200 / missing fields |
| By-department API endpoint                          | request | GET /api/reports/by-department returns Engineering + others  | "Engineering" present with count > 0  | non-200 / missing dept   |
| PTO summary API endpoint                            | request | GET /api/reports/pto-summary returns pending+approved+denied | sum > 0                               | non-200 / all zero       |

## Hidden surfaces opened from this page

(none; reports view is read-only)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger           | method | path                       | what request body or query is expected |
| ----------------- | ------ | -------------------------- | -------------------------------------- |
| initial mount     | GET    | /api/dashboard-stats       | (authenticated bearer)                 |
| reports breakdown | GET    | /api/reports/headcount     | (authenticated bearer)                 |
| reports breakdown | GET    | /api/reports/by-department | (authenticated bearer)                 |
| reports breakdown | GET    | /api/reports/pto-summary   | (authenticated bearer)                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
