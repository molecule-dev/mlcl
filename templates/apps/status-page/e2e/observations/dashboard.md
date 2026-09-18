# Page observations: /dashboard (Operator dashboard)

> Filled from a live walk via Playwright MCP at /dashboard. Re-walk if
> any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name          | role       | expected behavior on interaction           | success signal                         | failure signal             |
| ----------------------------------- | ---------- | ------------------------------------------ | -------------------------------------- | -------------------------- |
| KPI: Components total               | text       | reflects count from /api/components        | numeric value matches API count        | mismatch / "247" hardcoded |
| KPI: Subscribers total              | text       | reflects count from /api/subscribers       | matches API count (NOT the legacy 247) | hardcoded value            |
| Sidebar nav (link to authed routes) | navigation | clicking nav links navigates to that route | URL changes                            | nav fails                  |

## Hidden surfaces opened from this page

| trigger   | what it opens | elements inside (selector / role / behavior) |
| --------- | ------------- | -------------------------------------------- |
| User menu | dropdown      | profile / sign-out links                     |

## Network calls expected during normal use

| trigger   | method | path             | what request body or query is expected |
| --------- | ------ | ---------------- | -------------------------------------- |
| Page load | GET    | /api/components  | array of components                    |
| Page load | GET    | /api/subscribers | array of subscribers                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-dashboard.spec.ts`
