# Page observations: /pricing (Pricing)

Captured from `browser_snapshot` on `http://localhost:3100/pricing`
while logged out. Renders the tier ladder declared by `api/src/tiers.ts`
through `<PricingPage>` from `@molecule/app-billing-react`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role      | expected behavior on interaction                                        | success signal                                             | failure signal      |
| ----------------------------------- | --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------- |
| `[data-mol-id="pricing-page"]`      | container | renders after a successful GET /api/billing/tiers                       | element visible                                            | element missing     |
| `[data-mol-id="pricing-tier-free"]` | article   | renders the free tier card with limits and CTA                          | "Free" heading + "Current plan" disabled button            | missing card        |
| `[data-mol-id="pricing-tier-pro"]`  | article   | renders the Pro tier card                                               | "Pro" heading + "Upgrade to Pro" CTA                       | missing card        |
| `[data-mol-id="pricing-tier-team"]` | article   | renders the Team tier card                                              | "Team" heading + "Upgrade to Team" CTA                     | missing card        |
| `[data-mol-id="pricing-cta-pro"]`   | button    | POST /api/billing/checkout to create a Stripe Checkout Session for Pro  | network response includes `checkoutUrl` (or auth redirect) | request never fires |
| `[data-mol-id="pricing-cta-team"]`  | button    | POST /api/billing/checkout to create a Stripe Checkout Session for Team | network response includes `checkoutUrl` (or auth redirect) | request never fires |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                                        | method | path                  | what request body or query is expected     |
| ---------------------------------------------- | ------ | --------------------- | ------------------------------------------ |
| Page load                                      | GET    | /api/billing/tiers    | tier ladder declared in `api/src/tiers.ts` |
| Click `pricing-cta-proMonthly` (auth required) | POST   | /api/billing/checkout | `{ priceId }`; returns `{ checkoutUrl }`   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
