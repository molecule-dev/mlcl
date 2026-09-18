# Page observations: /order/:id/confirm (OrderConfirm)

> Captured after a simulated checkout fulfillment redirects here.

## Page state assumed

- [x] Authenticated — buyer must be signed in

## Elements

| selector / accessible name                   | role           | expected behavior on interaction        | success signal       | failure signal    |
| -------------------------------------------- | -------------- | --------------------------------------- | -------------------- | ----------------- |
| Receipt header (Order #)                     | heading        | shows order number from /api/orders/:id | h1 visible           | missing           |
| `getByText(/license key/i)`                  | text           | shows the issued license key            | masked key visible   | missing           |
| `getByRole('button', { name: /download/i })` | button         | starts download via /api/downloads/:id  | browser dialog       | error toast       |
| `getByRole('link', { name: /library/i })`    | link           | nav to /library                         | URL becomes /library | no nav            |
| `getByRole('link', { name: /back to shop     | continue/i })` | link                                    | nav to /shop         | URL becomes /shop | no nav |

## Hidden surfaces opened from this page

| trigger         | what it opens       | elements inside          |
| --------------- | ------------------- | ------------------------ |
| Download button | browser save dialog | filename matches product |

## Network calls expected during normal use

| trigger        | method | path                      | expected body                           |
| -------------- | ------ | ------------------------- | --------------------------------------- |
| Page load      | GET    | /api/orders/:id           | returns order with items + license keys |
| Download click | GET    | /api/downloads/:productId | returns signed URL JSON                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/order__id_confirm.spec.ts`
