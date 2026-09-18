# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required to view; CTAs require auth)

## Elements

| selector / accessible name                                              | role              | expected behavior on interaction                                                                               | success signal                                                                                    | failure signal                           |
| ----------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `getByRole('heading', { name: /Choose your Sojourn plan/i, level: 1 })` | heading           | renders the page heading                                                                                       | heading is visible                                                                                | not visible                              |
| `getByRole('heading', { name: /^Free$/, level: 2 })`                    | heading           | renders the Free tier card                                                                                     | heading is visible                                                                                | not visible                              |
| `getByRole('button', { name: /Current plan/i })`                        | button (disabled) | the free row's CTA is disabled for unauthenticated/free users                                                  | `toBeDisabled` is true                                                                            | enabled                                  |
| `getByRole('button', { name: /Upgrade to Pro/i })`                      | button            | POST `/api/billing/checkout` with `{ planKey: 'pro' }` and either redirect to Stripe or render an inline error | window.location changes to a `https://checkout.stripe.com/...` URL or `data-billing-error` is set | stays on `/pricing` with no network call |
| `getByRole('button', { name: /Upgrade to Team/i })`                     | button            | POST `/api/billing/checkout` with `{ planKey: 'team' }`                                                        | Stripe redirect or inline error                                                                   | stays on `/pricing` with no network call |

## Hidden surfaces opened from this page

| trigger                                 | what it opens | elements inside |
| --------------------------------------- | ------------- | --------------- |
| (none — pricing tiers are inline cards) | —             | —               |

## Network calls expected during normal use

| trigger               | method | path                  | what request body or query is expected |
| --------------------- | ------ | --------------------- | -------------------------------------- |
| Page load             | GET    | /api/billing/tiers    | returns `{ tiers, currentPlanKey }`    |
| Upgrade to Pro / Team | POST   | /api/billing/checkout | `{ planKey: 'pro' \| 'team' }`         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
