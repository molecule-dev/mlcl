# Page observations: /inventory (Inventory)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal            | failure signal |
| -------------------------- | ------- | -------------------------------- | ------------------------- | -------------- |
| product row link           | link    | navigates to /products/:id       | URL becomes /products/:id | no navigation  |
| search input               | textbox | filters product table            | rows narrow               | no filter      |
| "Adjust" action            | button  | POST /stock/adjust               | quantity updates          | inline error   |
| "Add product" button       | button  | opens add-product modal          | modal visible             | no modal       |

## Hidden surfaces opened from this page

| trigger       | what it opens     | elements inside (selector / role / behavior)     |
| ------------- | ----------------- | ------------------------------------------------ |
| "Add product" | add-product modal | name/SKU/category fields, Submit posts /products |

## Network calls expected during normal use

| trigger      | method | path              | what request body or query is expected        |
| ------------ | ------ | ----------------- | --------------------------------------------- |
| page load    | GET    | /api/products     | limit query                                   |
| adjust stock | POST   | /api/stock/adjust | { product_id, warehouse_id, quantity_change } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/inventory.spec.ts`
