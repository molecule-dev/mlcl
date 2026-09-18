# Page observations: /reports (Reports)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction        | success signal     | failure signal |
| -------------------------- | ------- | --------------------------------------- | ------------------ | -------------- |
| heading "Reports"          | heading | renders page title                      | visible            | missing        |
| export CSV button          | button  | GET /reports/export.csv → blob download | download triggered | no blob        |
| date-range picker          | group   | changes report scope                    | data refreshes     | no refresh     |
| category breakdown table   | table   | renders per-category KPIs               | ≥1 row             | empty          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                    | what request body or query is expected |
| --------- | ------ | ----------------------- | -------------------------------------- |
| page load | GET    | /api/reports            | date range query                       |
| export    | GET    | /api/reports/export.csv | date range query                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
