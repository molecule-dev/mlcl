# Page observations: /reports (Reports)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name     | role    | expected behavior on interaction                             | success signal  | failure signal     |
| ------------------------------ | ------- | ------------------------------------------------------------ | --------------- | ------------------ |
| `getByRole("heading").first()` | heading | reports page heading paints                                  | visible         | absent             |
| stat KPI cards                 | region  | KPI cards (open / resolved / SLA) render with numeric values | numbers visible | NaN / dash / 5xx   |
| no global error                | region  | page renders without the RootErrorBoundary fallback          | no role=alert   | role=alert visible |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path         | what request body or query is expected |
| ------- | ------ | ------------ | -------------------------------------- |
| mount   | GET    | /api/tickets | (none — feeds the KPI computation)     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
