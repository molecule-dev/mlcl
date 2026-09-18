# Page observations: /pricing (Pricing)

Tiered pricing page reading from `GET /api/billing/tiers` (mounted by
@molecule/app-billing-react via `routes/billing.ts`). Three plan cards
(Free / Pro / Team). Free CTA links to /login; paid CTAs hit
`POST /api/billing/checkout` and either redirect to a real Stripe
Checkout URL or reload (when an in-place plan-change is queued).

## Page state assumed

- [x] Public (no auth required to view; sign-in required to purchase)

## Elements

| selector / accessible name                                                 | role   | expected behavior on interaction                  | success signal                                                                          | failure signal                |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------- |
| Free tier CTA `getByRole('link', { name: /sign\s*in/i })`                  | link   | navigate to /login                                | URL becomes /login                                                                      | no navigation                 |
| Pro tier CTA `getByTestId/data-mol-id="pricing-cta-pro"`                   | button | start Stripe Checkout for the Pro Monthly priceId | POST /api/billing/checkout returns 200 with checkoutUrl pointing at checkout.stripe.com | error message under the cards |
| Team tier CTA `data-mol-id="pricing-cta-team"`                             | button | start Stripe Checkout for Team Monthly priceId    | POST /api/billing/checkout returns 200 with checkoutUrl                                 | error message                 |
| Header "Sign in" link `getByRole('link', { name: /sign\s*in/i })` (header) | link   | navigate to /login                                | URL becomes /login                                                                      | no navigation                 |
| Brand link `getByRole('link', { name: /Roost/i }).first()` (header)        | link   | navigate to /                                     | URL becomes /                                                                           | no navigation                 |

## Hidden surfaces opened from this page

(none — three flat plan cards)

## Network calls expected during normal use

| trigger                    | method | path                  | what request body or query is expected                                                    |
| -------------------------- | ------ | --------------------- | ----------------------------------------------------------------------------------------- |
| initial mount              | GET    | /api/billing/tiers    | 200 with three tiers (free, pro, team) and stripePriceIds populated when env keys present |
| paid CTA click (signed in) | POST   | /api/billing/checkout | { priceId } → 200 + { checkoutUrl: 'https://checkout.stripe.com/...' }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
