# Page observations: /pricing (Pricing)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role | expected behavior on interaction | success signal       | failure signal |
| ----------------------------------------------------- | ---- | -------------------------------- | -------------------- | -------------- |
| `[data-mol-id="pricing-cta-free"]` (Get started free) | link | navigates to /signup             | URL contains /signup | URL unchanged  |
| `[data-mol-id="pricing-cta-pro"]` (Choose Pro)        | link | navigates to /signup             | URL contains /signup | URL unchanged  |
| `[data-mol-id="pricing-cta-team"]` (Choose Team)      | link | navigates to /signup             | URL contains /signup | URL unchanged  |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected |
| -------------- | ------ | ------------------ | -------------------------------------- |
| initial render | GET    | /api/billing/tiers | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
