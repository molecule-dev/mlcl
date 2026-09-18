# Page observations: /settings/billing (Billing)

Source: live walk via Playwright + e2e/settings_billing.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                                                  | success signal                                                  | failure signal               |
| ------------------------------------------------------ | ------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| `getByRole("heading", { name: /Plan and invoices/i })` | heading | billing page renders + GET /api/billing + GET /api/billing/tiers fire             | heading visible + both GETs                                     | heading missing or GETs fail |
| `getByRole("button", { name: /Change plan/i })`        | button  | opens the plan picker (data-testid=plan-picker)                                   | plan-picker visible                                             | no picker                    |
| plan-picker upgrade button                             | button  | click any plan picker button → POST /api/billing/checkout returns real Stripe URL | response.checkoutUrl matches checkout.stripe.com/c/pay/cs_test_ | no Stripe URL                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                  | what request body or query is expected              |
| ------------ | ------ | --------------------- | --------------------------------------------------- |
| initial load | GET    | /api/billing          | 200 with billing summary                            |
| initial load | GET    | /api/billing/tiers    | 200 with pricing tiers                              |
| upgrade      | POST   | /api/billing/checkout | {priceId} body — 200 with {checkoutUrl: stripe URL} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings_billing.spec.ts`
