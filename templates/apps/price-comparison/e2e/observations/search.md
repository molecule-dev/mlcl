# Page observations: /search (Search)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction        | success signal              | failure signal   |
| ------------------------------------------- | ------- | --------------------------------------- | --------------------------- | ---------------- |
| `[data-test=search-input]` query field      | textbox | filters product grid by name/brand/desc | grid narrows on type        | grid unchanged   |
| `[data-test=search-category]` chip-group    | toggle  | filters by category                     | only matching cards visible | filter ignored   |
| `[data-test=search-max-price]` slider/input | textbox | filters by max best_price               | grid narrows                | filter ignored   |
| `[data-test=search-grid]` results grid      | grid    | renders products from /api/products     | ≥1 card after seed          | empty after seed |
| product card link                           | link    | navigates to /products/:id              | URL becomes /products/:id   | dead link        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path               | what request body or query is expected |
| ------------- | ------ | ------------------ | -------------------------------------- |
| page load     | GET    | /api/products      | limit=200, auth header                 |
| catalog empty | POST   | /api/products/seed | empty body, auth header                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
