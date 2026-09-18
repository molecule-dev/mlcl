# Page observations: /pricing

> Captured live via Playwright MCP at `http://localhost:3070/pricing` while
> signed in as a fresh free-tier user.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); page is also reachable while signed-out

## Elements

| selector / accessible name                                      | role    | expected behavior on interaction                              | success signal                                                            | failure signal                                                       |
| --------------------------------------------------------------- | ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `getByRole('heading', { name: /choose your.*plan/i })`          | heading | renders top of page                                           | visible                                                                   | missing                                                              |
| Free plan card                                                  | article | display free-tier features and disabled "Current plan" button | "Free" heading and "$0" visible; button disabled with text "Current plan" | button is enabled or label is wrong                                  |
| `getByRole('button', { name: 'Current plan', disabled: true })` | button  | (disabled) signals user is on free                            | disabled state present                                                    | enabled                                                              |
| Pro plan card                                                   | article | display Pro tier features                                     | "Pro" heading and "$15/mo" visible                                        | wrong name or price                                                  |
| `getByRole('button', { name: /upgrade to pro/i })`              | button  | POST `/api/billing/checkout` `{ priceId                       | planKey: 'pro' }`; redirect to a real Stripe Checkout URL                 | response status 200 with a `checkout.stripe.com` URL or 303 redirect | 4xx or response without checkout URL |
| Team plan card                                                  | article | display Team tier features                                    | "Team" heading and "$49/mo" visible                                       | wrong name or price                                                  |
| `getByRole('button', { name: /upgrade to team/i })`             | button  | POST `/api/billing/checkout` `{ priceId                       | planKey: 'team' }`; redirect to a real Stripe Checkout URL                | response status 200 with a `checkout.stripe.com` URL                 | 4xx or no checkout URL               |

## Hidden surfaces opened from this page

| trigger                                                                                     | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — pricing has no menus, modals, drawers; clicking upgrade leaves the page for Stripe) | —             | —                                            |

## Network calls expected during normal use

| trigger             | method | path                    | what request body or query is expected                                |
| ------------------- | ------ | ----------------------- | --------------------------------------------------------------------- |
| initial load        | GET    | `/api/billing/tiers`    | returns array of `{ key, name, priceCents, ... }` for the three tiers |
| initial load        | GET    | `/api/billing/status`   | current user's effective tier                                         |
| Upgrade to Pro/Team | POST   | `/api/billing/checkout` | `{ priceId                                                            | planKey }`, returns Stripe Checkout `{ url }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
