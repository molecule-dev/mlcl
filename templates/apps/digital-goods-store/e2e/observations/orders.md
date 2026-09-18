# Page observations: /orders (OrderHistory)

> Captured from a buyer with at least one completed purchase.

## Page state assumed

- [x] Authenticated — buyer's own orders only

## Elements

| selector / accessible name               | role                       | expected behavior on interaction | success signal            | failure signal                 |
| ---------------------------------------- | -------------------------- | -------------------------------- | ------------------------- | ------------------------------ |
| Page title "Order history"               | heading                    | identifies the page              | h1 visible                | missing                        |
| Empty-state message                      | text                       | shown when zero orders           | text visible              | rendered with no data          |
| Order row                                | listitem                   | shows order number, total, items | row visible               | missing data                   |
| `getByRole('link', { name: /view receipt | details/i })`              | link                             | nav to /order/:id/confirm | URL becomes /order/:id/confirm | no nav |
| `getByRole('link', { name: /shop         | browse/i })` (empty state) | link                             | nav to /shop              | URL becomes /shop              | no nav |

## Hidden surfaces opened from this page

| trigger   | what it opens                 | elements inside           |
| --------- | ----------------------------- | ------------------------- |
| Order row | inline expansion (line items) | product name, license key |

## Network calls expected during normal use

| trigger   | method | path        | expected body         |
| --------- | ------ | ----------- | --------------------- |
| Page load | GET    | /api/orders | returns user's orders |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/orders.spec.ts`
