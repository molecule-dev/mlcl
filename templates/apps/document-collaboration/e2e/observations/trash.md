# Page observations: /trash (Trash)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/trash`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name         | role   | expected behavior on interaction | success signal         | failure signal |
| ---------------------------------- | ------ | -------------------------------- | ---------------------- | -------------- |
| `getByTestId("trash-restore-...")` | button | POST /api/documents/:id/restore  | doc removed from trash |                |
| `getByTestId("trash-delete-...")`  | button | DELETE /api/documents/:id        | GET 404                |                |
| `getByTestId("trash-empty-all")`   | button | empties trash                    | all rows deleted       |                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| page load | GET    | /api/documents/trash       | trashed docs                           |
| restore   | POST   | /api/documents/:id/restore | {}                                     |
| delete    | DELETE | /api/documents/:id         | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
