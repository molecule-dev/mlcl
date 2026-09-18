# Page observations: /pricing (Pricing)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required) — Pro upgrade requires auth

## Elements

| selector / accessible name                              | role   | expected behavior on interaction                                 | success signal                       | failure signal |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------- | ------------------------------------ | -------------- |
| Pro plan card                                           | region | render plan name, price ($15/mo), feature list                   | text contains "Pro" + "$15"          | card missing   |
| `getByRole('button', { name: /upgrade to pro/i })`      | button | when authed, POST `/api/billing/checkout` and redirect to Stripe | navigates to checkout.stripe.com URL | error toast    |
| Free plan card                                          | region | render the free tier feature list with no CTA                    | "Free" copy visible                  | card missing   |
| `getByRole('link', { name: /sign in/i })` (when public) | link   | navigate to /login from nav                                      | URL becomes /login                   | nav fails      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                       | method | path                  | what request body or query is expected                     |
| ----------------------------- | ------ | --------------------- | ---------------------------------------------------------- |
| Page mount                    | GET    | /api/billing/tiers    | returns `{ data: [{ key, prices: [{ stripePriceId }] }] }` |
| Upgrade to Pro click (authed) | POST   | /api/billing/checkout | `{ priceId }` returns `{ checkoutUrl }`                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
