# Page observations: /pricing (Pricing & Billing)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/pricing.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction                                    | success signal                      | failure signal                                                              |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `locator('[data-mol-id="pricing-page"]')`      | section | the @molecule/app-billing-react PricingPage mounts without crashing | section visible, no console errors  | "Cannot read properties of undefined"                                       |
| `locator('[data-mol-id="pricing-page"]')`      | section | shows tier copy from /api/billing/tiers                             | tier names + prices visible         | tiers list empty                                                            |
| `getByRole('button', { name: /upgrade          | select  | choose/i }).first()`                                                | button                              | starts /api/billing/checkout (or returns 503 when Stripe is not configured) | server returns 200, 400, or 503 — never 5xx unhandled | crash with no response |
| `getByRole('button', { name: /cancel/i })`     | button  | calls /api/billing/cancel; returns 400/503 when no active sub       | server returns a controlled 4xx/503 | unhandled crash                                                             |
| `getByRole('link', { name: /home/i }).first()` | link    | provides a way back to /home from /pricing                          | URL becomes /home                   | no link present                                                             |
| `[data-mol-id="pricing-page"]` (after reload)  | section | pricing page survives a hard reload                                 | section re-renders with same tiers  | white-screen on reload                                                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                  | what request body or query is expected                       |
| ------- | ------ | --------------------- | ------------------------------------------------------------ |
| Mount   | GET    | /api/billing/tiers    | array of `{ key, name, price, ... }` tiers                   |
| Mount   | GET    | /api/billing/status   | current user's billing status                                |
| Upgrade | POST   | /api/billing/checkout | `{ tier }` — opens Stripe checkout when configured, else 503 |
| Cancel  | POST   | /api/billing/cancel   | empty body — 400/503 when nothing to cancel                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-pricing.spec.ts`
