# Page observations: /pricing

> Observed via Playwright at http://localhost:3080/pricing — public
> pricing page rendered by `pages/Pricing.tsx`. Tiers come from
> /api/billing/tiers; Upgrade buttons POST /api/billing/checkout and
> redirect to a real Stripe Checkout session.

## Page state assumed

- [x] Public (CTA navigates to /signup if not authenticated)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                                        | success signal                              | failure signal    |
| ------------------------------------------------- | ------- | ----------------------------------------------------------------------- | ------------------------------------------- | ----------------- |
| `getByRole('heading')` (page title)               | heading | renders the pricing title                                               | visible                                     | missing           |
| Free tier card `[data-mol-id="pricing-cta-free"]` | button  | "Current plan" / disabled for free users                                | visible, disabled state correct             | wrong state       |
| Pro tier card `[data-mol-id="pricing-cta-pro"]`   | button  | submits POST /api/billing/checkout → window.location.assign(stripe URL) | URL becomes checkout.stripe.com / cs_test_… | stays on /pricing |
| Team tier card `[data-mol-id="pricing-cta-team"]` | button  | submits POST /api/billing/checkout for team tier                        | URL becomes checkout.stripe.com             | stays on /pricing |
| Tier feature list (per tier)                      | list    | renders included entitlements from server                               | non-empty                                   | empty             |

## Hidden surfaces opened from this page

| trigger                                  | what it opens | elements inside |
| ---------------------------------------- | ------------- | --------------- |
| (none — single page, redirects on click) | —             | —               |

## Network calls expected during normal use

| trigger           | method | path                  | what request body or query is expected |
| ----------------- | ------ | --------------------- | -------------------------------------- |
| Page load         | GET    | /api/billing/tiers    | tier list with stripePriceId per price |
| Upgrade Pro click | POST   | /api/billing/checkout | { priceId } → { checkoutUrl }          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/08-billing.spec.ts` (tiers + upgrade + direct API check)
