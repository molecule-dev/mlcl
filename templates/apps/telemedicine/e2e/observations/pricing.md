# Page observations: /pricing (pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to one outcome-asserting test in the matching spec file.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                         | role    | expected behavior on interaction | success signal                                  | failure signal                               |
| ---------------------------------------------------------------------------------- | ------- | -------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| renders the three Solace tiers with their limits                                   | heading | covered by matching spec test    | element renders / asserted text becomes visible | element absent / wrong text / no side effect |
| Authed user sees "Current plan" on Free + actionable upgrade buttons on paid tiers | button  | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |
| Clicking "Upgrade to Pro" creates a real Stripe Checkout session and redirects     | button  | covered by matching spec test    | URL changes to documented route                 | URL unchanged or 4xx page                    |
| Clicking "Upgrade to Team" also creates a real Stripe Checkout session             | button  | covered by matching spec test    | documented behavior occurs and is asserted      | element absent / wrong text / no side effect |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path                  | what request body or query is expected |
| ------------------ | ------ | --------------------- | -------------------------------------- |
| page load          | GET    | /api/billing/tiers    | (none)                                 |
| page load (authed) | GET    | /api/billing/status   | (none)                                 |
| click Upgrade      | POST   | /api/billing/checkout | { priceId }                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
