# Page observations: /pricing (Pricing)

> Filled by AI agent driving the running app on http://localhost:3020.
> Uses real Stripe test-mode key from fill-smoke-env so checkout returns
> a live checkout.stripe.com URL.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`) for upgrade flow

## Elements

| selector / accessible name           | role    | expected behavior on interaction                                   | success signal                                                                    | failure signal                                  |
| ------------------------------------ | ------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| `getByRole("heading", { level: 1 })` | heading | renders the pricing page heading                                   | visible h1                                                                        | spinner stuck / missing heading                 |
| `[data-mol-id="pricing-tier-free"]`  | article | renders the free tier card                                         | card visible with limits                                                          | missing card / "Could not load pricing" error   |
| `[data-mol-id="pricing-tier-pro"]`   | article | renders the Pro tier card                                          | card visible with limits and Pro price                                            | missing card                                    |
| `[data-mol-id="pricing-tier-team"]`  | article | renders the Team tier card                                         | card visible with limits and Team price                                           | missing card                                    |
| `[data-mol-id="pricing-cta-free"]`   | button  | shows the "Current plan" label and is disabled (no priceId)        | button is disabled with text "Current plan"                                       | enabled / triggers upgrade                      |
| `[data-mol-id="pricing-cta-pro"]`    | button  | POSTs /api/billing/checkout, then navigates to checkout.stripe.com | response.checkoutUrl matches /^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/ | "Could not start checkout" error / 4xx response |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected                                |
| ------------- | ------ | --------------------- | --------------------------------------------------------------------- |
| load /pricing | GET    | /api/billing/tiers    | no body; response { data: [free, pro, team] }                         |
| click upgrade | POST   | /api/billing/checkout | { priceId }; response { checkoutUrl } pointing at checkout.stripe.com |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
