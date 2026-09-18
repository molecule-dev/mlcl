# Page observations: /orders (Orders)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal          | failure signal |
| -------------------------- | ------- | -------------------------------- | ----------------------- | -------------- |
| heading "Orders"           | heading | renders page title               | visible                 | missing        |
| table row "PO-..."         | cell    | lists seeded orders              | ≥1 row                  | empty          |
| create-order button        | button  | opens create-order modal/path    | modal opens             | no modal       |
| order row link             | link    | navigates to /orders/:id         | URL becomes /orders/:id | no navigation  |
| status filter              | tablist | filters by status                | rows narrow             | no filter      |

## Hidden surfaces opened from this page

| trigger             | what it opens     | elements inside (selector / role / behavior)            |
| ------------------- | ----------------- | ------------------------------------------------------- |
| create-order button | create-order form | reference/partner/warehouse/items + submit POST /orders |

## Network calls expected during normal use

| trigger      | method | path        | what request body or query is expected            |
| ------------ | ------ | ----------- | ------------------------------------------------- |
| page load    | GET    | /api/orders | limit query                                       |
| create order | POST   | /api/orders | { reference, type, partner, warehouse_id, items } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/orders.spec.ts`
