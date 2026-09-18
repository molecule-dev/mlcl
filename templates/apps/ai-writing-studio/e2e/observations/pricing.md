# Page observations: /pricing (Pricing)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required) — anonymous users are routed to /signup; authed users get a Stripe Checkout URL.

## Elements

| selector / accessible name                                                                            | role    | expected behavior on interaction                                                                                            | success signal                                                  | failure signal                     |
| ----------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------- |
| `getByRole('heading', { name: /Choose your .+ plan/i })`                                              | heading | renders pricing heading                                                                                                     | heading visible                                                 | heading missing                    |
| `getByText(/Starter/i).first()`                                                                       | text    | Starter tier card renders                                                                                                   | tier visible with limits                                        | card missing                       |
| `getByText(/Pro/i).first()`                                                                           | text    | Pro tier card renders                                                                                                       | tier visible with limits                                        | card missing                       |
| `getByText(/Team/i).first()`                                                                          | text    | Team tier card renders                                                                                                      | tier visible with limits                                        | card missing                       |
| `getByRole('button', { name: /Choose plan\|Subscribe\|Start with this plan\|Get started/i }).first()` | button  | for unauthed user → routes to /signup; for authed user → POSTs `/api/billing/checkout` and navigates to Stripe Checkout URL | URL contains `checkout.stripe.com` (authed) OR `/signup` (anon) | stays on /pricing without redirect |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                      | method | path                  | what request body or query is expected                                       |
| ---------------------------- | ------ | --------------------- | ---------------------------------------------------------------------------- |
| initial render               | GET    | /api/billing/tiers    | returns array of `{ id, name, priceCents, currency, interval, limits, ... }` |
| paid-plan CTA click (authed) | POST   | /api/billing/checkout | `{ tierId }` → 200 with `{ url: 'https://checkout.stripe.com/...' }`         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
