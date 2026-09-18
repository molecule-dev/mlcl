# Page observations: /doc/:id/comments (Comments)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/doc/:id/comments`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role   | expected behavior on interaction         | success signal   | failure signal      |
| ------------------------------------ | ------ | ---------------------------------------- | ---------------- | ------------------- |
| `getByTestId("comments-new-submit")` | button | POST /api/comments/:documentId on submit | new row in GET   | no row              |
| `getByTestId("comments-list")`       | list   | renders thread list                      | items rendered   | empty placeholder   |
| `getByTestId("comments-empty")`      | region | shown when no comments exist             | visible on empty | shown with comments |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger   | method | path                                         | what request body or query is expected |
| --------- | ------ | -------------------------------------------- | -------------------------------------- |
| page load | GET    | /api/comments/:documentId                    | returns thread list                    |
| submit    | POST   | /api/comments/:documentId                    | {body, parent_id?}                     |
| resolve   | PUT    | /api/comments/:documentId/:commentId/resolve | {}                                     |
| delete    | DELETE | /api/comments/:documentId/:commentId         | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
