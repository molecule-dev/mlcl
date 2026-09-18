# Page observations: /docs/endpoints (Endpoints)

Source: live walk via Playwright + e2e/docs_endpoints.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role      | expected behavior on interaction                              | success signal                       | failure signal               |
| ------------------------------------------------------ | --------- | ------------------------------------------------------------- | ------------------------------------ | ---------------------------- |
| `getByRole("heading", { name: /^Endpoints$/i })`       | heading   | endpoints page renders, GET /api/endpoints fires              | heading visible + GET /api/endpoints | heading missing or GET fails |
| `getByPlaceholder(/Search method, path, or summary/i)` | searchbox | typing filters the visible endpoints (or empty-state if none) | value persists in DOM                | input not editable           |
| empty/loaded state                                     | text      | either grouped sections render OR empty-state text is visible | one of the two visible               | spinner stuck                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected |
| ------------ | ------ | -------------- | -------------------------------------- |
| initial load | GET    | /api/endpoints | 200 with array                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/docs_endpoints.spec.ts`
