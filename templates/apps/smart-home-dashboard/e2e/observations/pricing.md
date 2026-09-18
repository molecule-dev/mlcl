# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role   | expected behavior on interaction                                        | success signal                      | failure signal       |
| ----------------------------------------- | ------ | ----------------------------------------------------------------------- | ----------------------------------- | -------------------- |
| `[data-mol-id="pricing-tier-free"]`       | card   | renders the free tier with limits                                       | tier card visible                   | missing              |
| `[data-mol-id="pricing-tier-pro"]`        | card   | renders the pro tier with limits                                        | tier card visible                   | missing              |
| `[data-mol-id="pricing-cta-pro"]`         | button | POST /api/billing/checkout with the pro priceId and redirects to Stripe | POST observed, real cs_test_... URL | no POST or empty URL |
| `getByRole('link', { name: /sign in/i })` | link   | navigates to /login                                                     | URL contains `/login`               | stays on /pricing    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger           | method | path                  | what request body or query is expected |
| ----------------- | ------ | --------------------- | -------------------------------------- |
| page mount        | GET    | /api/billing/tiers    | (no body)                              |
| click upgrade pro | POST   | /api/billing/checkout | `{ priceId }`                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
