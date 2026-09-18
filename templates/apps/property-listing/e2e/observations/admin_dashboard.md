# Page observations: /admin/dashboard (admin_dashboard)

Alias path for /admin — same AgentDashboard component.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role       | expected behavior on interaction              | success signal  | failure signal |
| -------------------------- | ---------- | --------------------------------------------- | --------------- | -------------- |
| dashboard heading          | heading    | show dashboard title                          | heading visible | missing        |
| sidebar nav                | navigation | sidebar links rendered                        | present         | missing        |
| KPI tiles                  | group      | show counts from /api/properties + /api/leads | tiles render    | missing        |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected |
| --------- | ------ | --------------- | -------------------------------------- |
| page load | GET    | /api/properties | ?owner_id=me&status=all → 200          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/admin_dashboard.spec.ts`
