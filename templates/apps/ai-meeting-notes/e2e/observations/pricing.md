# Page observations: /pricing (Pricing)

> Public — three-tier pricing page (Free, Pro, Team) backed by GET
> /api/billing/tiers. Each tier has a CTA button. Authenticated callers
> can "Upgrade" via POST /api/billing/checkout to a real Stripe session.

## Page state assumed

- [x] Public (no auth required) — tiers render either way; CTA behavior
      depends on auth state

## Elements

| selector / accessible name                          | role      | expected behavior on interaction                                                   | success signal                                                                    | failure signal         |
| --------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------- |
| `page.locator('[data-mol-id="pricing-page"]')`      | container | wraps the entire pricing layout                                                    | element visible                                                                   | empty page             |
| `getByRole('heading', { name: /choose your.*plan    | pricing   | plans/i })`                                                                        | heading                                                                           | h1 identifies the page | h1 visible | empty page |
| `page.locator('[data-mol-id="pricing-tier-free"]')` | card      | renders the Free tier card from /api/billing/tiers                                 | card visible                                                                      | card missing           |
| `page.locator('[data-mol-id="pricing-tier-pro"]')`  | card      | renders the Pro tier card                                                          | card visible                                                                      | card missing           |
| `page.locator('[data-mol-id="pricing-tier-team"]')` | card      | renders the Team tier card                                                         | card visible                                                                      | card missing           |
| `page.locator('[data-mol-id="pricing-cta-pro"]')`   | button    | when authed, POST /api/billing/checkout and navigate to a real Stripe Checkout URL | URL becomes a `checkout.stripe.com/c/pay/cs_test_*` page (or `cs_test_` returned) | error toast / no nav   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger                           | method | path                  | what request body or query is expected                  |
| --------------------------------- | ------ | --------------------- | ------------------------------------------------------- |
| Page load                         | GET    | /api/billing/tiers    | `{ data: [free, pro, team] }` with stripePriceId values |
| Click Upgrade to Pro CTA (authed) | POST   | /api/billing/checkout | `{ priceId }` returns `{ checkoutUrl }`                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-pricing.spec.ts`
