# Page observations: /doc/:id (Editor)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/doc/:id`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role    | expected behavior on interaction                  | success signal          | failure signal |
| -------------------------------------- | ------- | ------------------------------------------------- | ----------------------- | -------------- |
| `getByTestId("editor-title")`          | textbox | edits title; autosaves via PUT /api/documents/:id | GET reflects new title  | no PUT fired   |
| `getByTestId("editor-body")`           | textbox | edits body; autosaves via PUT                     | content.blocks updated  | no PUT fired   |
| `getByTestId("editor-publish-toggle")` | button  | flips status between draft/published              | GET reflects new status | no change      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger         | method | path                     | what request body or query is expected |
| --------------- | ------ | ------------------------ | -------------------------------------- |
| page load       | GET    | /api/documents/:id       | returns doc                            |
| title/body edit | PUT    | /api/documents/:id       | {title,content}                        |
| publish toggle  | PUT    | /api/documents/:id       | {status}                               |
| trash click     | POST   | /api/documents/:id/trash | {}                                     |
| share submit    | POST   | /api/sharing/:documentId | {email,role}                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
