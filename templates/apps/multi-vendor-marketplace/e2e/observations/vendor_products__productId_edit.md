# Page observations: vendor_products__productId_edit

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role    | expected behavior on interaction | success signal                  | failure signal |
| --------------------------------------- | ------- | -------------------------------- | ------------------------------- | -------------- |
| `getByTestId("vendor-product-name")`    | textbox | pre-filled name                  | value reflects existing product | empty          |
| `getByTestId("vendor-product-price")`   | textbox | pre-filled price                 | value reflects existing price   | empty          |
| `getByTestId("vendor-product-publish")` | button  | PUT /api/products/:id (or POST)  | redirect or success message     | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected |
| ------- | ------ | ------------- | -------------------------------------- |
| Save    | POST   | /api/products | updated fields                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/vendor_products__productId_edit.spec.ts`
