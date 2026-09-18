# Page observations: /shared (Shared)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user with workspace bootstrapped

## Elements

| selector / accessible name            | role   | expected behavior on interaction | success signal              | failure signal |
| ------------------------------------- | ------ | -------------------------------- | --------------------------- | -------------- |
| Heading "Shared with you"             | text   | Renders feed title               | visible heading             | missing        |
| Recording row (workspace)             | link   | Navigates to /recordings/:id     | URL becomes /recordings/:id | inert          |
| Filter buttons (all/workspace/public) | button | Filters the feed                 | row count changes           | inert          |
| Empty state                           | text   | Renders when feed is empty       | visible empty message       | crash          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| page load | GET    | /api/recordings/feed | auth header only                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-shared.spec.ts`
