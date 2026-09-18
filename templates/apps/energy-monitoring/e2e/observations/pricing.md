# Page observations: /pricing (Pricing)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                     | role          | expected behavior on interaction                                                                  | success signal                                                         | failure signal                            |
| -------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| `page.locator('[data-mol-id="pricing-grid"]')`                 | region        | renders the grid with one [data-mol-id="pricing-plan-:key"] per tier (free + pro + team)          | grid visible; one card per configured tier                             | no tier cards render                      |
| `page.locator('[data-mol-id="pricing-period-year"]').first()`  | button        | annual toggle re-renders prices (e.g. /mo ↔ /yr)                                                  | [data-mol-id="pricing-plan-pro-price"] innerText changes               | prices unchanged                          |
| `page.locator('[data-mol-id="pricing-plan-pro-cta"]').first()` | link / button | logged-out: routes to /signup or /login. logged-in: POST /api/billing/checkout returns Stripe URL | logged-out lands on /signup; logged-in nav matches checkout.stripe.com | CTA does nothing, or POST returns non-2xx |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger                 | method | path                  | what request body or query is expected           |
| ----------------------- | ------ | --------------------- | ------------------------------------------------ |
| page load               | GET    | /api/billing/tiers    | `{ data: ApiTier[] }`                            |
| logged-in upgrade click | POST   | /api/billing/checkout | `{ tier, period }` → returns Stripe Checkout URL |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
