# Page observations: /templates (Templates)

> Filled by AI agent driving the running app via Playwright.

## Procedure

1. Navigate to `/templates`.
2. Snapshot accessibility tree.
3. Verify each row below corresponds to a real interactive element.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name         | role   | expected behavior on interaction    | success signal                 | failure signal |
| ---------------------------------- | ------ | ----------------------------------- | ------------------------------ | -------------- |
| `getByTestId("templates-blank")`   | link   | creates blank doc                   | POST /api/documents → /doc/:id |                |
| `getByTestId("templates-grid")`    | list   | lists seeded templates              | >=6 cards                      | empty          |
| `getByTestId("templates-use-...")` | button | POST /api/templates/:id/instantiate | navigate to new /doc/:id       |                |
| `getByTestId("templates-cat-...")` | button | category filter                     | narrows visible templates      |                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| n/a     | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger   | method | path                           | what request body or query is expected |
| --------- | ------ | ------------------------------ | -------------------------------------- |
| page load | GET    | /api/templates                 | templates list                         |
| use       | POST   | /api/templates/:id/instantiate | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the spec
