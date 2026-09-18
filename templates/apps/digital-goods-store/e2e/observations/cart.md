# Page observations: /cart (Cart)

> Captured from rendered page after navigating to /cart.

## Page state assumed

- [x] Public — cart is browser-local until checkout starts

## Elements

| selector / accessible name                            | role             | expected behavior on interaction | success signal        | failure signal    |
| ----------------------------------------------------- | ---------------- | -------------------------------- | --------------------- | ----------------- |
| Empty-state CTA `getByRole('link', { name: /browse    | storefront/i })` | link                             | nav to /shop          | URL becomes /shop | no nav |
| Line item row                                         | listitem         | shows product name + price       | row visible           | missing data      |
| `[data-testid="cart-quantity-up"]`                    | button           | increments quantity              | qty changes           | no change         |
| `[data-testid="cart-quantity-down"]`                  | button           | decrements quantity (min 1)      | qty changes           | no change         |
| `[data-testid="cart-remove"]`                         | button           | removes a line                   | row removed           | row stays         |
| `getByRole('link', { name: /proceed to checkout/i })` | link             | nav to /checkout                 | URL becomes /checkout | no nav            |

## Hidden surfaces opened from this page

| trigger       | what it opens | elements inside |
| ------------- | ------------- | --------------- |
| Remove button | inline delete | line disappears |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

> The cart is fully client-side (`localStorage` + `lib/cart.ts`); no network
> traffic fires until the user proceeds to /checkout. Backend products lookup
> (`/api/products`) is exercised on /shop and /shop/:slug specs instead.

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/cart.spec.ts`
