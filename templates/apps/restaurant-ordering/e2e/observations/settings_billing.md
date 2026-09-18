# Page observations: /settings/billing (Billing)

> Authenticated — subscription / pricing page. Renders three tier
> cards (Free, Pro, Team) with monthly price and feature highlights, a
> "Current plan" indicator, and an "Upgrade" CTA per paid tier that
> opens a Stripe Checkout session.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name    | role   | expected behavior on interaction                                                               | success signal                                             | failure signal                                       |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| tier card "Free"              | text   | renders the documented free-plan tier with price/limits                                        | card visible with $0 and limit copy                        | card missing                                         |
| tier card "Pro"               | text   | renders the Pro tier with non-zero price + "Upgrade" CTA                                       | card + CTA visible                                         | card missing or CTA absent                           |
| tier card "Team"              | text   | renders the Team tier with non-zero price + "Upgrade" CTA                                      | card + CTA visible                                         | card missing or CTA absent                           |
| current-plan indicator (Free) | text   | a fresh signup is on the Free plan; status is reflected in the UI                              | "Free" badge or selected state on Free card                | wrong tier marked as current                         |
| Upgrade CTA → Stripe checkout | button | POST /api/billing/checkout `{priceId}` returns a `checkout.stripe.com` URL the UI redirects to | response contains a real Stripe URL; unknown priceId → 400 | endpoint returns sandbox/fake URL or 200 on bogus id |

## Hidden surfaces opened from this page

| trigger     | what it opens                          | elements inside         |
| ----------- | -------------------------------------- | ----------------------- |
| Upgrade CTA | external Stripe Checkout (browser nav) | n/a (handled by Stripe) |

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
- [x] All elements above have a corresponding test in `e2e/08-settings_billing.spec.ts`
