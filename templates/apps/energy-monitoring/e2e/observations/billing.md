# Page observations: /billing (Billing)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role                  | expected behavior on interaction                                            | success signal                                       | failure signal                                                        |
| ------------------------------------------------ | --------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `page.locator('main')`                           | region                | shows current plan loaded from /api/billing/status (Free for new users)     | CURRENT PLAN section names "Free"                    | wrong tier or missing                                                 |
| `page.locator('[data-mol-id^="pricing-plan-"]')` | region                | tier grid renders all configured tiers                                      | count >= 3 cards (free + pro + team)                 | fewer cards rendered                                                  |
| `getByRole('button', { name: /switch to pro      | upgrade/i }).first()` | button                                                                      | POST /api/billing/checkout returns a real Stripe URL | response body has Stripe Checkout URL (https://checkout.stripe.com/…) | no POST or fake URL |
| `page.locator('main')`                           | region                | feature limits show numeric counts (meters, readings, alert rules), not "—" | limits row contains numeric strings                  | placeholder dashes                                                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected                                            |
| ------------- | ------ | --------------------- | --------------------------------------------------------------------------------- |
| initial load  | GET    | /api/billing/status   | returns `{ tier: "free"                                                           | "pro" | "team", … }` |
| initial load  | GET    | /api/billing/tiers    | returns `{ data: ApiTier[] }`                                                     |
| Switch to Pro | POST   | /api/billing/checkout | `{ tier: "pro", period: "monthly" }` → `{ url: "https://checkout.stripe.com/…" }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
