# Page observations: /library (Library)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user with workspace bootstrapped

## Elements

| selector / accessible name              | role   | expected behavior on interaction | success signal                        | failure signal      |
| --------------------------------------- | ------ | -------------------------------- | ------------------------------------- | ------------------- |
| Library hero / heading                  | text   | Renders library title            | "Library" or "Recordings" visible     | missing             |
| Recording card title                    | link   | Navigates to /recordings/:id     | URL becomes /recordings/:id           | dead link           |
| Filter buttons (mine / shared / public) | button | Filters the list                 | row count changes                     | inert               |
| Empty state message                     | text   | Renders when no recordings exist | "no recordings" visible for new users | crash on empty list |
| New recording CTA                       | link   | Routes to /record                | URL becomes /record                   | inert               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path            | what request body or query is expected |
| --------- | ------ | --------------- | -------------------------------------- |
| page load | GET    | /api/recordings | auth header only                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-library.spec.ts`
