# Page observations: /pricing (Pricing)

> Filled from a live walk via Playwright MCP at /pricing.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role   | expected behavior on interaction                                                                      | success signal                            | failure signal |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------- |
| `[data-mol-id=pricing-tier-free]` Current plan button | button | disabled — current plan placeholder, no nav                                                           | button stays disabled                     | clickable      |
| `[data-mol-id=pricing-cta-pro]` Upgrade to Pro        | button | POST `/api/billing/checkout` with paid Stripe price id, then `window.location` to checkout.stripe.com | redirect URL contains checkout.stripe.com | toast / 4xx    |
| `[data-mol-id=pricing-cta-team]` Upgrade to Team      | button | same as Pro but with team-tier price id                                                               | redirect URL contains checkout.stripe.com | toast / 4xx    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected                                          |
| ------------- | ------ | --------------------- | ------------------------------------------------------------------------------- |
| Page load     | GET    | /api/billing/tiers    | returns `{ data: [{ key, name, prices, limits }] }`                             |
| Upgrade click | POST   | /api/billing/checkout | `{ priceId, tierKey, period, successUrl, cancelUrl }` returns `{ checkoutUrl }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
