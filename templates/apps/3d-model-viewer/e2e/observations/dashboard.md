# Page observations: /dashboard (Dashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role      | expected behavior on interaction           | success signal                               | failure signal              |
| -------------------------- | --------- | ------------------------------------------ | -------------------------------------------- | --------------------------- |
| Total Models stat card     | statistic | reflects count from GET /api/models        | numeric value matches list length            | shows hard-coded value      |
| Storage Used stat card     | statistic | reflects sum of file_size from /api/models | numeric value updates as models change       | static value                |
| Activity Feed list         | list      | renders rows from GET /api/activity        | rendered rows present after seeding activity | list is empty after seeding |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
