# Page observations: /pricing (Pricing)

Source: live walk via Playwright + e2e/pricing.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)` + `completeOnboarding(page)`)

## Elements

| selector / accessible name                         | role   | expected behavior on interaction                                | success signal                                    | failure signal       |
| -------------------------------------------------- | ------ | --------------------------------------------------------------- | ------------------------------------------------- | -------------------- |
| three pricing cards (Free / Pro / Team)            | list   | tiers render with limits + CTAs                                 | three tier cards visible                          | no cards / API error |
| `getByRole("button", { name: /upgrade to pro/i })` | button | POST /api/billing/checkout → redirects to checkout.stripe.com   | page.url() matches checkout.stripe.com/.*cs_test_ | remains on /pricing  |
| Free tier card body                                | list   | shows Free tier limits (kb/diary/foods/etc.)                    | list rows render                                  | list missing         |
| Team tier upgrade button                           | button | POST /api/billing/checkout for Team price → redirects to Stripe | page.url() matches checkout.stripe.com            | remains on /pricing  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected |
| ------------- | ------ | --------------------- | -------------------------------------- |
| Page load     | GET    | /api/billing/tiers    | 200 with tiers array                   |
| Click Upgrade | POST   | /api/billing/checkout | { price_id } → { url } 200             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
