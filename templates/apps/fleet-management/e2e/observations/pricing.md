# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required) — pricing tiers come from /api/billing/tiers

## Elements

| selector / accessible name                         | role                 | expected behavior on interaction                 | success signal                           | failure signal                 |
| -------------------------------------------------- | -------------------- | ------------------------------------------------ | ---------------------------------------- | ------------------------------ |
| `getByRole('heading', { name: /choose              | plan/i, level: 1 })` | heading                                          | visible page heading                     | heading shows after tiers load | error fallback or undefined |
| `[data-mol-id="pricing-tier-free"]`                | article              | renders Free tier card                           | card visible with tier name + limits     | card missing                   |
| `[data-mol-id="pricing-tier-pro"]`                 | article              | renders Pro tier card with $15/mo price          | card visible with tier name + limits     | card missing                   |
| `[data-mol-id="pricing-tier-team"]`                | article              | renders Team tier card with $49/mo price         | card visible with tier name + limits     | card missing                   |
| `[data-mol-id="pricing-cta-pro"]` (Upgrade to Pro) | button               | POST /api/billing/checkout → Stripe Checkout URL | response.checkoutUrl is a stripe.com URL | empty/missing checkoutUrl      |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside (selector / role / behavior) |
| ------------------------------ | ------------- | -------------------------------------------- |
| (none — tiers always rendered) | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected       |
| ------------- | ------ | --------------------- | -------------------------------------------- |
| Initial mount | GET    | /api/billing/tiers    | server returns `{ data: [free, pro, team] }` |
| Click Upgrade | POST   | /api/billing/checkout | { priceId } body, requires auth              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
