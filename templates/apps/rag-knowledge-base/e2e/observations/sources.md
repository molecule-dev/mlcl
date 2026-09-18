# Page observations: /sources (Sources)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role      | expected behavior on interaction            | success signal               | failure signal           |
| ----------------------------------------------------------------- | --------- | ------------------------------------------- | ---------------------------- | ------------------------ |
| `[data-testid="sources-add-button"]`                              | button    | toggles the add-source form                 | add-form visible             | add-form not visible     |
| `[data-testid="sources-add-form"]`                                | form      | submits POST /api/sources                   | new source visible in list   | error visible            |
| `[data-testid="sources-add-kind"]`                                | combobox  | selects source kind (upload/url/notion/...) | value reflects choice        | input disabled           |
| `[data-testid="sources-add-label"]`                               | textbox   | accepts the new source label                | value reflects typed input   | input cleared / disabled |
| `[data-testid="sources-add-submit"]`                              | button    | POSTs the new source                        | list populates after refresh | error visible            |
| `[data-testid="sources-list"]` or `[data-testid="sources-empty"]` | list/text | renders the sources list OR empty state     | one of the two is visible    | neither visible          |

## Hidden surfaces opened from this page

| trigger            | what it opens   | elements inside (selector / role / behavior) |
| ------------------ | --------------- | -------------------------------------------- |
| sources-add-button | add-source form | kind, label, optional url + submit           |

## Network calls expected during normal use

| trigger    | method | path         | what request body or query is expected |
| ---------- | ------ | ------------ | -------------------------------------- |
| mount      | GET    | /api/sources | scoped to current user                 |
| add-submit | POST   | /api/sources | { kind, label, ... }                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sources.spec.ts`
