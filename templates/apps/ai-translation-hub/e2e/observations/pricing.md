# Page observations: /pricing (Pricing)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/pricing.
> Headings observed: 1: Choose your Rendition plan, 2: Free, 2: Pro, 2: Team.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name         | role   | expected behavior on interaction | success signal | failure signal |
| ---------------------------------- | ------ | -------------------------------- | -------------- | -------------- |
| `[data-mol-id="pricing-cta-free"]` | button | clicks "Current plan"            | visible result | no change      |
| `[data-mol-id="pricing-cta-pro"]`  | button | clicks "Upgrade to Pro"          | visible result | no change      |
| `[data-mol-id="pricing-cta-team"]` | button | clicks "Upgrade to Team"         | visible result | no change      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path               | expected body |
| --------- | ------ | ------------------ | ------------- |
| Page load | GET    | /api/billing/tiers | response 200  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
