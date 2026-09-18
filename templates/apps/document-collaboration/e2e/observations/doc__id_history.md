# Page observations: /doc/:id/history (VersionHistory)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/doc/:id/history`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role   | expected behavior on interaction                  | success signal       | failure signal       |
| -------------------------------------- | ------ | ------------------------------------------------- | -------------------- | -------------------- |
| `getByTestId("version-history-grid")`  | list   | renders snapshot timeline                         | rows rendered        | empty placeholder    |
| `getByTestId("version-history-empty")` | region | shown when no snapshots                           | visible empty        | shown with snapshots |
| `getByTestId("version-restore")`       | button | POST /api/versions/:documentId/restore/:versionId | doc.content reverted | no change            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger       | method | path                                         | what request body or query is expected |
| ------------- | ------ | -------------------------------------------- | -------------------------------------- |
| page load     | GET    | /api/versions/:documentId                    | returns snapshots                      |
| restore click | POST   | /api/versions/:documentId/restore/:versionId | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
