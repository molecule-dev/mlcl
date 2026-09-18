# Page observations: /settings/billing (Billing)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role      | expected behavior on interaction                                  | success signal               | failure signal |
| ----------------------------------------- | --------- | ----------------------------------------------------------------- | ---------------------------- | -------------- |
| `[data-test=billing-page]` shell          | container | renders heading with current plan                                 | "You are on Free" or similar | empty          |
| `[data-test=billing-plans]` plans grid    | grid      | renders 3 tier cards from /billing/tiers                          | 3 cards visible              | empty          |
| `[data-test=billing-plan-free]` Free card | card      | shows free tier features                                          | card rendered                | missing        |
| `[data-test=billing-plan-pro]` Pro card   | card      | shows Pro features + price                                        | card rendered, highlighted   | missing        |
| `[data-test=billing-cta-pro]` Pro CTA     | button    | POST /api/billing/checkout (or shows Stripe-not-configured error) | redirect or error message    | silent no-op   |
| `[data-test=billing-cta-free]` Free CTA   | button    | POST /api/billing/cancel                                          | status reflects free         | silent no-op   |
| "Back to settings" link                   | link      | navigates to /settings                                            | URL is /settings             | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger           | method | path                  | what request body or query is expected |
| ----------------- | ------ | --------------------- | -------------------------------------- |
| page load         | GET    | /api/billing/tiers    | none                                   |
| page load         | GET    | /api/billing/status   | none                                   |
| Pro CTA           | POST   | /api/billing/checkout | priceId                                |
| Free CTA / cancel | POST   | /api/billing/cancel   | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings_billing.spec.ts`
