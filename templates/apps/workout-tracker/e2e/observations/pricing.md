# Page observations: /pricing + /plan-updated

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100.
> Public for `/pricing`. `/plan-updated` is the post-Stripe success
> callback page (also reachable directly with `?cancelled=1`).

## Page state assumed

- [x] Public for `/pricing` (3-tier marketing). Authenticated for the
      Upgrade-to-Pro click that initiates Stripe Checkout.

## Elements

| selector / accessible name                                                                   | role    | expected behavior on interaction                                                              | success signal                                  | failure signal                           |
| -------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| `locator('h1, h2').filter({ hasText: /Choose your.*plan/i })`                                | heading | renders the pricing hero copy                                                                 | heading visible at the top of the page          | wrong copy, blank hero                   |
| `getByText(/^Free$/i)`, `getByText(/^Pro$/i)`, `getByText(/^Team$/i)`                        | text    | three tier columns render side-by-side                                                        | all three names visible                         | tier cards missing                       |
| `getByRole('button', { name: /upgrade.*pro/i })`                                             | button  | POST /api/billing/checkout, then `window.location` redirects to a real Stripe `cs_test_*` URL | URL becomes `checkout.stripe.com/.../cs_test_*` | stays on `/pricing`, no checkout request |
| `/plan-updated` success heading (`page.locator('h1').filter({ hasText: /plan.*updated/i })`) | heading | post-checkout success page renders the upgrade copy                                           | heading visible                                 | wrong copy, error                        |
| `/plan-updated?cancelled=1` heading (`page.locator('h1').filter({ hasText: /cancel/i })`)    | heading | renders the cancellation copy when Stripe sends the user back without paying                  | heading visible                                 | wrong copy / 404                         |

## Hidden surfaces opened from this page

(none — pricing is a flat marketing page; the tier-comparison details are
visible without expansion)

## Network calls expected during normal use

| trigger              | method | path                  | expected body                                     |
| -------------------- | ------ | --------------------- | ------------------------------------------------- |
| Page load (Pricing)  | GET    | /api/billing/tiers    | tiers array containing keys `free`, `pro`, `team` |
| Click Upgrade to Pro | POST   | /api/billing/checkout | 200, `{ checkoutUrl }` containing `cs_test_*`     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-pricing.spec.ts`
