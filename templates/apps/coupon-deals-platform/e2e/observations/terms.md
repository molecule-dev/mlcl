# Page observations: /terms (Terms)

> Captured anonymously — static legal page, no API calls.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                  | role    | expected behavior on interaction | success signal  | failure signal    |
| --------------------------------------------------------------------------- | ------- | -------------------------------- | --------------- | ----------------- |
| `getByRole('link', { name: /back to snagr/i })`                             | link    | nav to /                         | URL becomes `/` | stays on `/terms` |
| `getByRole('heading', { name: /terms of service/i, level: 1 })`             | heading | renders the page title           | visible         | missing           |
| `getByRole('heading', { name: /your account/i, level: 2 })`                 | heading | renders the account section      | visible         | missing           |
| `getByRole('heading', { name: /saving and redeeming coupons/i, level: 2 })` | heading | renders the coupons section      | visible         | missing           |
| `getByRole('heading', { name: /merchant honour/i, level: 2 })`              | heading | renders the merchant section     | visible         | missing           |
| `getByRole('heading', { name: /billing/i, level: 2 })`                      | heading | renders the billing section      | visible         | missing           |

## Hidden surfaces opened from this page

| trigger                    | what it opens | elements inside |
| -------------------------- | ------------- | --------------- |
| (none — static legal page) | —             | —               |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
