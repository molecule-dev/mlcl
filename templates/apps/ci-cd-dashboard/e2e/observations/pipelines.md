# Page observations: /pipelines (Pipelines)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role                | expected behavior on interaction       | success signal                       | failure signal              |
| -------------------------------------------------------- | ------------------- | -------------------------------------- | ------------------------------------ | --------------------------- |
| `getByRole('heading', { name: /Pipelines/i, level: 1 })` | heading             | renders page title                     | heading visible                      | absent                      |
| `text=/realtime/i`                                       | text                | shows live status pill                 | element visible                      | absent                      |
| `getByText('Running').first()`                           | KPI tile            | shows running pipeline count           | count >= 0                           | tile missing                |
| `getByText('Queued').first()`                            | KPI tile            | shows queued count                     | count >= 0                           | tile missing                |
| `getByText(/Success rate/i)`                             | KPI tile            | shows success rate %                   | percentage shown                     | tile missing                |
| `getByText('Failed').first()`                            | KPI tile            | shows failed count                     | count >= 0                           | tile missing                |
| filter buttons (All / Running / Passed / Failed)         | filter button       | filters list by status with live count | clicking filters list rows by status | counts wrong / no filtering |
| `a[href^="/pipelines/"]`                                 | link (pipeline row) | navigates to pipeline detail           | URL becomes /pipelines/:id           | stays on /pipelines         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected |
| --------- | ------ | -------------- | -------------------------------------- |
| Page load | GET    | /api/pipelines | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pipelines.spec.ts`
