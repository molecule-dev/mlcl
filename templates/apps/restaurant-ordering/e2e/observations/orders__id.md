# Page observations: /orders/:id (OrderDetail)

> Authenticated — single-order kitchen ticket. Header showing the
> order id, line-item table with menu name + qty + line total, an
> auto-computed subtotal, status pill (pending / preparing / ready /
> served / paid / cancelled), Pay action, Cancel action.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role   | expected behavior on interaction                                                          | success signal                                                       | failure signal                                  |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| line-item rows             | text   | render menu_item name + quantity + per-line total                                         | each ordered item visible with qty                                   | row missing or qty mis-rendered                 |
| subtotal / total label     | text   | reflects the server-computed total (price × qty), not client trust                        | matches server `total_cents/100`                                     | UI reports a different number than the API body |
| status pill                | text   | reflects the lifecycle state from PUT /api/orders/:id/status                              | "pending" → "preparing" → "ready" → "served" → "paid" survive reload | status frozen / wrong label                     |
| pay action                 | button | POST /api/orders/:id/pay (cash) marks the order paid; second call returns `success:false` | first call 200 with `success:true`, second guarded                   | double-pay succeeds (invariant violation)       |
| cancel action              | button | PUT /api/orders/:id/status `{status:'cancelled'}` flips the pill                          | reload still shows `cancelled`                                       | order stays in `pending` after cancel           |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none observed) | n/a           | n/a             |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-orders__id.spec.ts`
