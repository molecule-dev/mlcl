# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/dashboard.spec.ts`.

## Procedure

1. `signup(page)` → lands on /dashboard automatically.
2. `mcp__playwright__browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role | expected behavior on interaction                 | success signal       | failure signal      |
| ---------------------------------------------- | ---- | ------------------------------------------------ | -------------------- | ------------------- |
| Headcount KPI card                             | text | shows seeded headcount from /api/dashboard-stats | non-zero number      | "Failed to load"    |
| Recent activity list                           | list | shows seeded notifications                       | at least one row     | empty / error       |
| `getByRole('link', { name: /add employee/i })` | link | navigates to /employees/new                      | URL → /employees/new | stays on /dashboard |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                 | what request body or query is expected |
| ------------- | ------ | -------------------- | -------------------------------------- |
| initial mount | GET    | /api/dashboard-stats | (authenticated bearer)                 |
| initial mount | GET    | /api/notifications   | (authenticated bearer)                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
