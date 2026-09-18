# Page observations: /products/:id/history (PriceHistory)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role      | expected behavior on interaction | success signal            | failure signal |
| ---------------------------------------------- | --------- | -------------------------------- | ------------------------- | -------------- |
| `[data-test=price-history-page]` shell         | container | page wrapper                     | rendered                  | empty          |
| `[data-test=history-product-name]` heading     | heading   | shows product.name               | matches API               | mismatch       |
| `[data-test=history-best-now]` best price      | text      | dollars rendered                 | matches API               | mismatch       |
| `[data-test=history-insights]` stats grid      | grid      | min / max / avg / current        | 4 cards visible           | empty          |
| `[data-test=history-by-retailer]` per-retailer | grid      | one card per source with chart   | ≥1 card after seed        | empty          |
| "Back to product" link                         | link      | navigates to /products/:id       | URL becomes /products/:id | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                    | what request body or query is expected |
| --------- | ------ | ----------------------- | -------------------------------------- |
| page load | GET    | /api/prices/history/:id | period=1y                              |
| page load | GET    | /api/sources            | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/products__id_history.spec.ts`
