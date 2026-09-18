# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/dashboard`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name          | role   | expected behavior on interaction            | success signal          | failure signal      |
| ----------------------------------- | ------ | ------------------------------------------- | ----------------------- | ------------------- |
| `getByTestId("dashboard-root")`     | region | renders the dashboard shell                 | visible                 | not in DOM          |
| `getByTestId("dashboard-new-doc")`  | button | creates a new doc, navigates to /doc/:id    | URL matches /doc/[uuid] | stays on /dashboard |
| `getByTestId("dashboard-doc-grid")` | list   | renders owned documents from /api/documents | >=3 cards (seeded)      | empty placeholder   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected |
| ------------- | ------ | --------------------- | -------------------------------------- |
| page load     | GET    | /api/documents        | returns owned docs                     |
| page load     | GET    | /api/documents/shared | returns shared docs                    |
| page load     | GET    | /api/notifications    | returns activity feed                  |
| click new-doc | POST   | /api/documents        | returns new doc with id                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
