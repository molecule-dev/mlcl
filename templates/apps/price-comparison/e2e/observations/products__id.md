# Page observations: /products/:id (ProductDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role      | expected behavior on interaction      | success signal                | failure signal |
| -------------------------------------------------- | --------- | ------------------------------------- | ----------------------------- | -------------- |
| `[data-test=product-detail-page]` shell            | container | renders product details               | visible after load            | empty          |
| `[data-test=product-detail-name]` name heading     | heading   | shows product.name from API           | matches API                   | mismatch       |
| `[data-test=product-detail-best-price]` best price | text      | shows lowest current price            | dollars rendered              | empty          |
| `[data-test=add-watchlist]` "Add to watchlist"     | button    | POST /api/watchlist                   | toggle to "Watching"          | error toast    |
| `[data-test=set-alert]` "Set alert"                | button    | POST /api/alerts with target_price    | alert appears, button toggles | error toast    |
| Retailer price table rows                          | table     | one row per source from /products/:id | ≥1 row after seed             | empty          |
| "View full price history" link                     | link      | navigates to /products/:id/history    | URL is /products/:id/history  | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger          | method | path                    | what request body or query is expected |
| ---------------- | ------ | ----------------------- | -------------------------------------- |
| page load        | GET    | /api/products/:id       | none                                   |
| page load        | GET    | /api/prices/history/:id | none                                   |
| add to watchlist | POST   | /api/watchlist          | product_id                             |
| set alert        | POST   | /api/alerts             | product_id, target_price               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/products__id.spec.ts`
