# Page observations: /pricing (pricing)

Public pricing/plan ladder rendered from /api/billing/tiers.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction      | success signal                 | failure signal |
| -------------------------- | ------- | ------------------------------------- | ------------------------------ | -------------- |
| pricing heading            | heading | static heading rendered               | heading visible                | missing        |
| tier cards                 | list    | cards hydrate from /api/billing/tiers | at least one paid tier visible | empty list     |
| CTA button                 | button  | CTA on every tier (subscribe/contact) | CTA buttons visible            | missing        |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| page load | GET    | /api/billing/tiers | → 200 array of tiers                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
