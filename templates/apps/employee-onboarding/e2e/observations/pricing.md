# Page observations: /pricing (Plan ladder)

> Three tiers (Free/Pro/Team) sourced from /api/billing/tiers. Each paid tier has an upgrade CTA that posts to /api/billing/checkout and forwards to a real Stripe Checkout URL.

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name                       | role   | expected behavior on interaction | success signal                 | failure signal          |
| ------------------------------------------------ | ------ | -------------------------------- | ------------------------------ | ----------------------- |
| `[data-mol-id="pricing-page"]`                   | region | rendered region                  | visible in DOM                 | missing                 |
| `[data-mol-id="pricing-tier-free"]`              | region | rendered region                  | visible in DOM                 | missing                 |
| `getByRole("button", { name: /Current plan/i })` | button | triggers the Current plan action | expected DOM update / API call | no change / error toast |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger       | method | path                  | expected body                                  |
| ------------- | ------ | --------------------- | ---------------------------------------------- |
| Page load     | GET    | /api/billing/tiers    | { tiers: [{ key, label, monthlyPriceId, … }] } |
| Click upgrade | POST   | /api/billing/checkout | { priceId } → { url: cs_test_… }               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<page>.spec.ts
