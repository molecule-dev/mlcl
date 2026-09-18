# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name        | role   | expected behavior on interaction                | success signal                         | failure signal               |
| --------------------------------- | ------ | ----------------------------------------------- | -------------------------------------- | ---------------------------- |
| `getByText(/free/i).first()`      | text   | render free-tier card                           | card visible with $0                   | absent                       |
| `getByText(/pro/i).first()`       | text   | render pro-tier card                            | card visible with monthly/annual price | absent                       |
| `getByText(/team/i).first()`      | text   | render team-tier card                           | card visible with monthly/annual price | absent                       |
| `[data-mol-id="pricing-cta-pro"]` | button | POST /api/billing/checkout via useStartCheckout | redirect to checkout.stripe.com        | 4xx for unauthenticated user |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| page load | GET    | /api/billing/tiers | (public list of tiers + priceIds)      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
