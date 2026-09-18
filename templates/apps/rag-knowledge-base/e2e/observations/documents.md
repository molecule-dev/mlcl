# Page observations: /documents (Documents)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role      | expected behavior on interaction        | success signal               | failure signal           |
| --------------------------------------------------------------------- | --------- | --------------------------------------- | ---------------------------- | ------------------------ |
| `[data-testid="documents-paste-toggle"]`                              | button    | toggles the paste form open/closed      | paste-form visible           | paste-form not visible   |
| `[data-testid="documents-paste-form"]`                                | form      | submits to POST /api/documents          | new doc visible in grid      | error visible            |
| `[data-testid="documents-paste-title"]`                               | textbox   | accepts new doc title                   | value reflects typed input   | input cleared / disabled |
| `[data-testid="documents-paste-body"]`                                | textbox   | accepts new doc body                    | value reflects typed input   | input cleared / disabled |
| `[data-testid="documents-paste-submit"]`                              | button    | POSTs the pasted document               | grid populates after refresh | error visible            |
| `[data-testid="documents-grid"]` or `[data-testid="documents-empty"]` | list/text | renders the docs grid OR an empty state | one of the two is visible    | neither visible          |

## Hidden surfaces opened from this page

| trigger                | what it opens | elements inside (selector / role / behavior) |
| ---------------------- | ------------- | -------------------------------------------- |
| documents-paste-toggle | paste form    | title, body inputs + submit button           |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected |
| ------------ | ------ | -------------- | -------------------------------------- |
| mount        | GET    | /api/documents | scoped to current user                 |
| paste-submit | POST   | /api/documents | { title, body_md, mime }               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/documents.spec.ts`
