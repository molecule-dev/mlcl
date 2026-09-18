# Page observations: /pricing (Pricing)

> Filled from a live walk via Playwright MCP at /pricing.

## Page state assumed

- [x] Public; tier CTAs activate Stripe Checkout when the visitor is signed in

## Elements

| selector / accessible name       | role    | expected behavior on interaction                                                  | success signal                              | failure signal        |
| -------------------------------- | ------- | --------------------------------------------------------------------------------- | ------------------------------------------- | --------------------- |
| `[data-mol-id="pricing-page"]`   | section | top-level pricing layout                                                          | visible after /api/billing/tiers resolves   | never mounts          |
| `[data-mol-id^="pricing-tier-"]` | article | one card per Stripe tier                                                          | ≥ 2 cards rendered (free + paid)            | only one or zero      |
| Tier price display               | text    | shows price for the selected period                                               | numeric "$X / month" visible                | shows "—" or empty    |
| `[data-mol-id^="pricing-cta-"]`  | button  | for tiers with a stripePriceId, POST /api/billing/checkout and redirect to Stripe | network captures POST /api/billing/checkout | nothing happens / 4xx |

## Hidden surfaces opened from this page

| trigger                      | what it opens                    | elements inside (selector / role / behavior)      |
| ---------------------------- | -------------------------------- | ------------------------------------------------- |
| Period switch (month / year) | re-renders prices for the period | each tier card re-renders with the matching price |

## Network calls expected during normal use

| trigger               | method | path                  | what request body or query is expected                  |
| --------------------- | ------ | --------------------- | ------------------------------------------------------- |
| Page load             | GET    | /api/billing/tiers    | `{ data: Array<TierEntry> }` with prices and limits     |
| CTA click (signed-in) | POST   | /api/billing/checkout | `{ priceId }` → `{ checkoutUrl }`; navigation to Stripe |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
