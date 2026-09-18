# Page observations: /products/:id (ProductDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal    | failure signal |
| -------------------------- | ------- | -------------------------------- | ----------------- | -------------- |
| heading (product name)     | heading | renders product.name from API    | visible           | missing        |
| SKU text                   | text    | renders product.sku              | visible           | missing        |
| KPI "On hand"              | card    | renders aggregate quantity       | visible           | missing        |
| back-to-inventory link     | link    | navigates to /inventory          | URL is /inventory | no navigation  |
| print labels button        | button  | invokes window.print()           | print fires       | no handler     |
| "not found" alert          | alert   | shown for unknown id             | visible           | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| page load | GET    | /api/products/:id    | auth                                   |
| page load | GET    | /api/stock/movements | product_id query                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/products__id.spec.ts`
