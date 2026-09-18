# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required to view; checkout requires auth)

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction                                                                                                                                             | success signal                                 | failure signal                                      |
| ------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `getByRole('heading', { name: /Choose your .* plan/i, level: 1 })` | heading | static page heading is rendered after `/api/billing/tiers` resolves                                                                                                          | heading visible                                | "Could not load pricing." error visible             |
| `[data-mol-id=pricing-tier-free]`                                  | article | renders the free-tier card with $0 monthly price and the limit list                                                                                                          | card visible, contains "$0" and "Free"         | card missing                                        |
| `[data-mol-id=pricing-tier-pro]`                                   | article | renders the Pro tier card with monthly price `$15/mo`                                                                                                                        | card visible, contains "$15"                   | card missing                                        |
| `[data-mol-id=pricing-tier-team]`                                  | article | renders the Team tier card with monthly price `$49/mo`                                                                                                                       | card visible, contains "$49"                   | card missing                                        |
| `[data-mol-id=pricing-cta-pro]`                                    | button  | when Stripe price IDs are provisioned, button label becomes "Upgrade to Pro" and is enabled (signed-in users get a Stripe Checkout session via POST `/api/billing/checkout`) | button is enabled AND label contains "Upgrade" | button is "Current plan" + disabled (price missing) |
| `[data-mol-id=pricing-cta-team]`                                   | button  | when Stripe price IDs are provisioned, button label becomes "Upgrade to Team" and is enabled                                                                                 | button enabled AND label contains "Upgrade"    | disabled                                            |
| `[data-mol-id=pricing-cta-free]`                                   | button  | free-tier button has no priceId so it stays disabled with "Current plan" label                                                                                               | button disabled                                | button enabled                                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected                            |
| ------------- | ------ | --------------------- | ----------------------------------------------------------------- |
| Page load     | GET    | /api/billing/tiers    | tier+price catalogue, including `stripePriceId` per non-free tier |
| Click Upgrade | POST   | /api/billing/checkout | `{ priceId }` — must return `{ checkoutUrl }` for signed-in users |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
