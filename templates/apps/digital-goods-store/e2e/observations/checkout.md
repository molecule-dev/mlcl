# Page observations: /checkout (Checkout)

> Captured from rendered page after adding an item to cart and navigating to /checkout.

## Page state assumed

- [x] Authenticated — buyer must be signed in to start a Stripe Checkout session

## Elements

| selector / accessible name            | role               | expected behavior on interaction  | success signal          | failure signal    |
| ------------------------------------- | ------------------ | --------------------------------- | ----------------------- | ----------------- |
| Empty-state link to /shop             | link               | nav to /shop when cart empty      | URL becomes /shop       | no nav            |
| `[data-testid="checkout-item"]`       | article            | shows product name + price        | element visible         | missing           |
| `[data-testid="checkout-pay"]`        | button             | POST /api/checkout/create-session | redirects to Stripe URL | inline error      |
| `[data-testid="checkout-total"]`      | text               | shows formatted USD total         | currency formatted      | missing total     |
| `getByRole('link', { name: /edit cart | back to cart/i })` | link                              | nav to /cart            | URL becomes /cart | no nav |

## Hidden surfaces opened from this page

| trigger    | what it opens      | elements inside |
| ---------- | ------------------ | --------------- |
| Pay button | Stripe-hosted page | (external)      |

## Network calls expected during normal use

| trigger   | method | path                         | expected body |
| --------- | ------ | ---------------------------- | ------------- |
| Click Pay | POST   | /api/checkout/create-session | { productId } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/checkout.spec.ts`
