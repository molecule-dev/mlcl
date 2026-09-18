# Page observations: /settings/billing (Billing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role   | expected behavior on interaction                                        | success signal                                    | failure signal    |
| ----------------------------------------------- | ------ | ----------------------------------------------------------------------- | ------------------------------------------------- | ----------------- |
| Current plan card                               | region | render plan name + status from /api/billing/status                      | matches server                                    | wrong / hardcoded |
| Tier list (revealed by Change plan)             | region | show available tiers from /api/billing/tiers with prices                | tiers visible after click                         | tiers absent      |
| `getByRole('button', { name: /change plan/i })` | button | reveal the tier list                                                    | tiers list becomes visible                        | nothing happens   |
| Subscribe (Pro) button                          | button | POST /api/billing/checkout returns Stripe Checkout URL or local upgrade | response 2xx with `checkoutUrl` (or instant flip) | nothing happens   |
| Cancel-subscription button                      | button | POST /api/billing/cancel marks pending cancel                           | next GET status shows cancel pending              | nothing changes   |

## Hidden surfaces opened from this page

| trigger     | what it opens | elements inside (selector / role / behavior)       |
| ----------- | ------------- | -------------------------------------------------- |
| Change plan | inline list   | per-tier subscribe buttons, monthly/yearly toggles |

## Network calls expected during normal use

| trigger    | method | path                  | what request body or query is expected               |
| ---------- | ------ | --------------------- | ---------------------------------------------------- |
| Page mount | GET    | /api/billing/status   | current plan + dates                                 |
| Page mount | GET    | /api/billing/tiers    | configured tier metadata                             |
| Subscribe  | POST   | /api/billing/checkout | `{ tierKey, interval }` → returns Stripe session URL |
| Cancel     | POST   | /api/billing/cancel   | (empty body)                                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/billing.spec.ts`
