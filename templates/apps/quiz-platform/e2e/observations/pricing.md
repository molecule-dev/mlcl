# Page observations: /pricing

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Public; behaves slightly differently if signed-in (extra `/api/billing/status` call to mark current tier).

## Elements

| selector / accessible name                     | role              | expected behavior on interaction                                                                                             | success signal                                                  | failure signal                    |
| ---------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- |
| `getByTestId('pricing-page')`                  | landmark `<main>` | rendered                                                                                                                     | element visible                                                 | missing                           |
| `getByTestId('period-month')` (text "Monthly") | toggle button     | sets period to "month"; aria-pressed=true                                                                                    | tier prices show monthly $; toggle visually active              | unchanged                         |
| `getByTestId('period-year')` (text "Yearly")   | toggle button     | sets period to "year"; aria-pressed=true                                                                                     | tier prices show yearly $; toggle visually active               | unchanged                         |
| `getByTestId('pricing-tiers')`                 | container         | one `<article data-testid="tier-{key}">` per tier from /api/billing/tiers                                                    | three tier cards visible (free + paid)                          | empty                             |
| `getByTestId('tier-free')`                     | article           | shows free plan limits                                                                                                       | "Free" + price "$0" visible                                     | missing                           |
| `getByTestId('checkout-free')`                 | button            | shows "Included"; disabled (free)                                                                                            | button disabled, text "Included"                                | clickable                         |
| `getByTestId('tier-pro')` (or other paid key)  | article           | shows paid plan limits                                                                                                       | name + price visible                                            | missing                           |
| `getByTestId('checkout-pro')`                  | button            | unauthed → navigate /signup?next=/pricing; authed → POST /api/billing/checkout, then redirect to Stripe URL or /plan-updated | URL changes accordingly; loading text "Starting…" while pending | error visible, URL stays /pricing |
| `getByRole('link', { name: /back to home/i })` | link              | navigates to /                                                                                                               | URL = /                                                         | otherwise                         |

## Hidden surfaces opened from this page

(none — it's a static page apart from period toggle)

## Network calls expected during normal use

| trigger                        | method | path                  | body / query                                                        |
| ------------------------------ | ------ | --------------------- | ------------------------------------------------------------------- |
| page load                      | GET    | /api/billing/tiers    | 200 returns `data: PricingTier[]`                                   |
| page load (signed-in only)     | GET    | /api/billing/status   | 200 returns current `category`/`planKey`                            |
| paid tier checkout (signed-in) | POST   | /api/billing/checkout | `{ priceId }`; 200 returns `{ checkoutUrl }` or `{ updated: true }` |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] both period toggles covered
- [x] free vs paid tier states covered
- [x] anonymous vs authed checkout flows covered
- [x] error state when /api/billing/tiers fails or POST returns 500 covered
- [x] all rows have a corresponding test in `e2e/pricing.spec.ts`
