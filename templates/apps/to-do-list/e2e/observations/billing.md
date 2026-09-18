# Page observations: billing (pricing + checkout + cancel + plan-updated)

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> the public `/pricing` page, the `/billing/*` API surface, and the
> public `/plan-updated` post-checkout success screen.

## Page state assumed

- [x] Mixed: `/pricing` and `/plan-updated` are public; status/checkout/cancel require auth.

## Elements

| selector / accessible name                                | role  | expected behavior on interaction                               | success signal                                    | failure signal                         |
| --------------------------------------------------------- | ----- | -------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| GET `/api/billing/tiers`                                  | route | Returns the three plans (free + pro + team)                    | `200`, array contains keys `free`, `pro`, `team`  | missing keys / non-2xx                 |
| GET `/api/billing/status` for a fresh signup              | route | Reports `planKey === 'free'` and `isFree === true`             | `200`, `planKey === 'free'`                       | wrong tier reported                    |
| POST `/api/billing/checkout` with a known Stripe price id | route | Returns a real `cs_test_…` Stripe checkout URL                 | `200`, body has `checkoutUrl` matching `cs_test_` | mock URL or no checkoutUrl             |
| POST `/api/billing/checkout` with an unknown price id     | route | Validates and rejects                                          | `400` (or 4xx)                                    | `200` with bogus URL                   |
| POST `/api/billing/cancel` without an active subscription | route | Returns 4xx (no-op for free users)                             | `4xx`                                             | `200` while user has no sub            |
| `/pricing` renders three plan cards (Free / Pro / Team)   | page  | Public page; no auth needed                                    | All three names visible within 15s                | "Could not load pricing" error visible |
| `/plan-updated` reachable post-checkout (public)          | page  | Renders success copy (heading mentioning Pro / plan / welcome) | Visible within 10s                                | `/login` redirect / 404                |

## Hidden surfaces opened from this page

| trigger                                    | what it opens                           | elements inside (selector / role / behavior) |
| ------------------------------------------ | --------------------------------------- | -------------------------------------------- |
| Click "Upgrade to Pro" while authenticated | redirects to Stripe Checkout (external) | Stripe page outside our app surface          |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected                                             |
| --------- | ------ | --------------------- | ---------------------------------------------------------------------------------- |
| Tier list | GET    | /api/billing/tiers    | → 200 `{ data: [...] }`                                                            |
| Status    | GET    | /api/billing/status   | → 200 `{ planKey, isFree, ... }`                                                   |
| Checkout  | POST   | /api/billing/checkout | `{ priceId }` → 200 `{ checkoutUrl: 'https://checkout.stripe.com/c/...cs_test_' }` |
| Cancel    | POST   | /api/billing/cancel   | empty body → 4xx for free users                                                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-billing.spec.ts`
