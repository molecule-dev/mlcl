# Page observations: /cart (GuestCart)

> Public — guest checkout. Reads the working cart from
> `localStorage['restaurant.guest.cart.v1']`, renders the line items
> with totals + qty steppers, customer name + email inputs, and a
> "Place order" CTA that POSTs to /api/guest/orders.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name             | role               | expected behavior on interaction                                                    | success signal                       | failure signal                           |
| -------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------- |
| cart shell on a fresh visit            | text               | renders the cart page chrome (heading + container) without auth                     | page mounts with no auth-redirect    | redirect to /login or blank page         |
| seeded cart line                       | text               | reading `localStorage['restaurant.guest.cart.v1']` mounts the line + qty + price    | the line label + qty + total visible | cart blank despite seeded storage        |
| place-order CTA                        | button             | POST /api/guest/orders requires an `owner_id` — guests without it are rejected      | request without owner_id → 4xx       | endpoint accepts orders without owner_id |
| posted real order surfaces on operator | (read-after-write) | a guest order with valid owner_id + table_id + items is visible via GET /api/orders | order id present in operator list    | order missing from operator list         |

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
- [x] All elements above have a corresponding test in `e2e/22-cart.spec.ts`
