# Page observations: /billing (Billing)

Source: live walk via Playwright + e2e/billing.spec.ts. Renders three
tier cards (free, pro, team) from /api/billing/tiers. Current plan
sourced from /api/billing/status. Pro CTA POSTs /api/billing/checkout
and follows the returned Stripe `cs_test_…` URL. Cancel button only
appears for paid tiers.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction                          | success signal                             | failure signal        |
| ------------------------------------------------------------------ | ------- | --------------------------------------------------------- | ------------------------------------------ | --------------------- |
| Three tier cards `[data-mol-id="tier-{free,pro,team}"]`            | section | one card per tier visible                                 | all three visible                          | any missing           |
| `[data-mol-id="tier-pro"]` Most popular badge                      | text    | only the Pro card has the badge                           | visible only on Pro                        | missing or wrong card |
| `[data-mol-id="tier-free-cta"]`                                    | button  | shows "Current plan" + disabled when on free              | disabled + label set                       | enabled or wrong text |
| `[data-mol-id="tier-pro-cta"]` (paid CTA)                          | button  | POST /api/billing/checkout returns Stripe `cs_test_…` URL | URL matches `^https://checkout.stripe.com` | error / no fetch      |
| Period toggle `[data-mol-id="period-month"]` ↔ `period-year`       | button  | flips displayed price text per card                       | tier-pro textContent differs               | unchanged             |
| `[data-mol-id="billing-current-plan"]`                             | text    | renders `{name} · {planKey}` from /api/billing/status     | matches API                                | wrong                 |
| Initial-load network: GET /api/billing/tiers + /api/billing/status | network | both 200 on first paint                                   | both fired + 200                           | missing fetch         |

## Network calls expected during normal use

| trigger      | method | path                  | what request body or query is expected               |
| ------------ | ------ | --------------------- | ---------------------------------------------------- |
| initial load | GET    | /api/billing/tiers    | 200 with `{data:[…]}`                                |
| initial load | GET    | /api/billing/status   | 200 with `{planKey, category, name, isFree, limits}` |
| upgrade      | POST   | /api/billing/checkout | `{priceId}` → 200 `{checkoutUrl}`                    |
| cancel       | POST   | /api/billing/cancel   | `{}` → 200                                           |

## Coverage check (final pass)

- [x] Three tier cards observed
- [x] Period toggle observed
- [x] Free → Free CTA disabled with "Current plan" verified
- [x] Pro CTA actually returns a Stripe `cs_test_…` checkout URL
- [x] Most popular badge on Pro
- [x] Initial GETs (tiers + status) observed in network capture
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
