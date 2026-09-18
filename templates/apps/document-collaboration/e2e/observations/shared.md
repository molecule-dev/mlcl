# Page observations: /shared (Shared)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/shared`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name    | role   | expected behavior on interaction | success signal | failure signal            |
| ----------------------------- | ------ | -------------------------------- | -------------- | ------------------------- |
| `getByTestId("shared-root")`  | region | shared shell                     | visible        | blank                     |
| `getByTestId("shared-grid")`  | list   | lists docs shared with me        | rows rendered  | empty without explanation |
| `getByTestId("shared-empty")` | region | shown when no shares             | visible empty  |                           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected |
| --------- | ------ | --------------------- | -------------------------------------- |
| page load | GET    | /api/documents/shared | shared docs                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
