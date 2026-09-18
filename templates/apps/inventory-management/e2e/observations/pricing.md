# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role      | expected behavior on interaction          | success signal                   | failure signal |
| -------------------------- | --------- | ----------------------------------------- | -------------------------------- | -------------- |
| heading "Pricing"          | heading   | renders page title                        | visible                          | missing        |
| tier card                  | article   | renders one card per /billing/tiers entry | ≥1 cards visible                 | no tiers       |
| paid-tier CTA              | button    | POST /billing/checkout → Stripe URL       | navigates to checkout.stripe.com | inline error   |
| limit bullet "products"    | list-item | renders product limit                     | visible                          | missing        |
| limit bullet "warehouses"  | list-item | renders warehouse limit                   | visible                          | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger          | method | path                  | what request body or query is expected |
| ---------------- | ------ | --------------------- | -------------------------------------- |
| page load        | GET    | /api/billing/tiers    | no body                                |
| select paid tier | POST   | /api/billing/checkout | { priceId }                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
