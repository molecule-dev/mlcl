# Page observations: /pricing + billing API surface

> Filled by AI agent driving the running app via Playwright MCP.
> Maps to `e2e/billing.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role     | expected behavior on interaction                                                             | success signal                              | failure signal                                                              |
| -------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| GET `/api/billing/tiers`                                       | endpoint | returns `{data: [{key:'free'                                                                 | 'pro'                                       | 'team', prices:[…stripePriceId]}]}`with real`price_…` ids surfaced from env | priceIds match `^price_` | nulls or stub structure |
| GET `/api/billing/status` for fresh user                       | endpoint | returns `{planKey:'free', category:'free', isFree:true, limits:{maxAlerts>0, ...}}`          | shape matches                               | 401 or stub                                                                 |
| POST `/api/billing/checkout` with valid pro priceId            | endpoint | returns `{checkoutUrl: 'https://checkout.stripe.com/...'}` from real Stripe Checkout Session | URL matches `^https://checkout.stripe.com/` | mock/empty URL                                                              |
| POST `/api/billing/checkout` with bogus priceId                | endpoint | returns 400 with `error` populated                                                           | status=400, body.error truthy               | 200 with checkoutUrl                                                        |
| `getByRole('button', { name: /upgrade to pro/i })` on /pricing | button   | navigates the browser to a real Stripe Checkout URL (`cs_test_/cs_live_`)                    | `waitForURL(/checkout.stripe.com.*cs_(test  | live)_/)` fires                                                             | stays on /pricing        |

## Network calls expected during normal use

| trigger           | method | path                  | what request body or query is expected |
| ----------------- | ------ | --------------------- | -------------------------------------- |
| /pricing render   | GET    | /api/billing/tiers    | (none)                                 |
| user UI plan card | GET    | /api/billing/status   | (cookie auth)                          |
| Upgrade click     | POST   | /api/billing/checkout | `{priceId: 'price_…'}`                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
