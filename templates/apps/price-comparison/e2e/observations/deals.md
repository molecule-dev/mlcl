# Page observations: /deals (Deals)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role       | expected behavior on interaction        | success signal            | failure signal |
| ----------------------------------------- | ---------- | --------------------------------------- | ------------------------- | -------------- |
| `[data-test=deals-page]` shell            | container  | page wrapper                            | rendered                  | not visible    |
| `[data-test=deals-summary]` summary chips | chip-group | shows hottest + count                   | renders with API data     | empty          |
| `[data-test=deals-grid]` deals grid       | grid       | one card per drop, sorted by drop% desc | ≥1 card after seed        | empty grid     |
| product card link                         | link       | navigates to /products/:id              | URL becomes /products/:id | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                     | what request body or query is expected |
| --------- | ------ | ------------------------ | -------------------------------------- |
| page load | GET    | /api/prices/trends/drops | limit=20, days=60                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/deals.spec.ts`
