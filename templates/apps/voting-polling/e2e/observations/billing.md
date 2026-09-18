# Page observations: /billing (Billing)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name        | role    | expected behavior on interaction                              | success signal                               | failure signal |
| --------------------------------- | ------- | ------------------------------------------------------------- | -------------------------------------------- | -------------- |
| `[data-test="billing-title"]`     | heading | render page title                                             | visible                                      | absent         |
| `[data-test="billing-tier-free"]` | card    | render free-tier card                                         | visible                                      | absent         |
| `[data-test="billing-tier-pro"]`  | card    | render pro-tier card                                          | visible                                      | absent         |
| `[data-test="billing-tier-team"]` | card    | render team-tier card                                         | visible                                      | absent         |
| `[data-test^="billing-buy-pro-"]` | button  | POST /api/billing/checkout { priceId } and redirect to Stripe | window.location flips to checkout.stripe.com | 4xx alert      |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected |
| ------------- | ------ | --------------------- | -------------------------------------- |
| page load     | GET    | /api/billing/status   | (planKey, isFree, limits)              |
| page load     | GET    | /api/billing/tiers    | (tier matrix with priceIds)            |
| upgrade click | POST   | /api/billing/checkout | { priceId }                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
