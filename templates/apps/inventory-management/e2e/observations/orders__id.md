# Page observations: /orders/:id (OrderDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name   | role      | expected behavior on interaction        | success signal            | failure signal |
| ---------------------------- | --------- | --------------------------------------- | ------------------------- | -------------- |
| heading (order reference)    | heading   | renders order.reference                 | visible                   | missing        |
| line items table             | table     | lists order.items                       | ≥1 row                    | empty          |
| subtotal cell                | cell      | computes Σ(qty × cost) / 100            | matches expected          | mismatch       |
| Mark received button         | button    | POST /orders/:id/receive                | status flips to RECEIVED  | inline error   |
| Cancel order button          | button    | POST /orders/:id/cancel after confirm() | status flips to CANCELLED | no change      |
| Order created timeline entry | list-item | renders audit trail event               | visible                   | missing        |
| back-to-orders link          | link      | navigates to /orders                    | URL is /orders            | no navigation  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                    | what request body or query is expected |
| ------------- | ------ | ----------------------- | -------------------------------------- |
| page load     | GET    | /api/orders/:id         | auth                                   |
| page load     | GET    | /api/stock/movements    | reference=order:id query               |
| mark received | POST   | /api/orders/:id/receive | no body                                |
| cancel        | POST   | /api/orders/:id/cancel  | no body                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/orders__id.spec.ts`
