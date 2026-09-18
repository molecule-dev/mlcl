# Page observations: /pricing (Public pricing tiers)

Captured via `node scripts/observe-page.mjs ai-study-buddy /pricing`.
Powered by `<PricingPage />` from `@molecule/app-billing-react`.

## Page state assumed

- [x] Public (no auth required) — but Upgrade CTA requires a session

## Elements

| selector / accessible name          | role    | expected behavior on interaction                             | success signal                  | failure signal             |
| ----------------------------------- | ------- | ------------------------------------------------------------ | ------------------------------- | -------------------------- |
| `[data-mol-id="pricing-page"]`      | section | top-level page wrapper from `<PricingPage />`                | visible                         | error / blank              |
| `[data-mol-id="pricing-tier-free"]` | article | renders the Free tier card                                   | visible                         | tier missing from response |
| `[data-mol-id="pricing-tier-pro"]`  | article | renders the Pro tier card                                    | visible                         | tier missing               |
| `[data-mol-id="pricing-tier-team"]` | article | renders the Team tier card                                   | visible                         | tier missing               |
| `[data-mol-id="pricing-cta-free"]`  | button  | disabled — Free tier has no `stripePriceId`                  | element visible AND disabled    | enabled (config bug)       |
| `[data-mol-id="pricing-cta-pro"]`   | button  | starts a Stripe Checkout session via `/api/billing/checkout` | redirect to checkout.stripe.com | stays on `/pricing`        |
| `[data-mol-id="pricing-cta-team"]`  | button  | starts a Stripe Checkout session for the Team price          | redirect to checkout.stripe.com | stays on `/pricing`        |
| `getByRole('heading')` (per tier)   | heading | renders the tier name (Free / Pro / Team)                    | heading visible                 | empty card                 |

## Hidden surfaces opened from this page

| trigger                             | what it opens                           | elements inside (selector / role / behavior) |
| ----------------------------------- | --------------------------------------- | -------------------------------------------- |
| Click `pricing-cta-pro` (anonymous) | navigates to `/login` first             | login form                                   |
| Click `pricing-cta-pro` (authed)    | external Stripe Checkout (out of scope) | Stripe-hosted page                           |

## Network calls expected during normal use

| trigger          | method | path                    | what request body or query is expected  |
| ---------------- | ------ | ----------------------- | --------------------------------------- |
| page mount       | GET    | `/api/billing/tiers`    | `{ data: [tier...] }`                   |
| Authed CTA click | POST   | `/api/billing/checkout` | `{ priceId }` returns `{ checkoutUrl }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/18-pricing.spec.ts`
