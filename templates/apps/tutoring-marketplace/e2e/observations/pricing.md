# Page observations: /pricing (Pricing)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (works whether signed in or not — affects CTA labels)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction          | success signal                               | failure signal   |
| ------------------------------------------------- | ------- | ----------------------------------------- | -------------------------------------------- | ---------------- |
| heading "Choose your Chalk plan"                  | heading | renders header                            | visible                                      | missing          |
| Free tier card                                    | region  | shows $0 + features                       | visible with "Current plan" or "Free" CTA    | card missing     |
| Pro tier card                                     | region  | shows $15/mo + features                   | "Upgrade to Pro" button visible              | missing          |
| Team tier card                                    | region  | shows $49/mo + features                   | "Upgrade to Team" button visible             | missing          |
| `getByRole('button', { name: /upgrade.*pro/i })`  | button  | POST /api/billing/checkout                | redirects to Stripe checkout cs_test_... URL | error in payload |
| `getByRole('button', { name: /upgrade.*team/i })` | button  | POST /api/billing/checkout (team priceId) | Stripe URL returned                          | error            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected |
| ------------- | ------ | --------------------- | -------------------------------------- |
| page load     | GET    | /api/billing/tiers    | returns free/pro/team catalog          |
| upgrade click | POST   | /api/billing/checkout | { priceId } returns { checkoutUrl }    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
