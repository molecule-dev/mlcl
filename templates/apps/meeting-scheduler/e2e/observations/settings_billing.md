# Page observations: /settings/billing (Billing)

Authenticated; reads /api/billing/status + tiers, opens real Stripe checkout.

Source: this page was driven live at `http://localhost:$VITE_PORT/settings/billing`
via Playwright + the matching `e2e/settings_billing.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name       | role   | expected behavior on interaction                          | success signal                               | failure signal       |
| -------------------------------- | ------ | --------------------------------------------------------- | -------------------------------------------- | -------------------- |
| current-plan card                | group  | renders the active plan from /api/billing/status          | plan name + price visible                    | card empty           |
| plan grid (Free + Pro + Team)    | group  | renders public tiers from /api/billing/tiers              | three tier cards visible                     | tiers missing        |
| monthly/yearly toggle            | switch | flips displayed prices                                    | price values change visibly                  | toggle is decorative |
| upgrade button → Stripe checkout | button | POST /api/billing/checkout returns a real cs_test_... URL | response.url starts with checkout.stripe.com | 4xx/5xx              |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings_billing.spec.ts`
