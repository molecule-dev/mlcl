# Page observations: /pricing (Pricing)

> Public pricing page wrapping `<PricingPage>` from
> `@molecule/app-billing-react`. Loads the active tiers from
> `/api/billing/tiers`. Each plan shows feature limits + an "Upgrade"
> CTA that initiates a real Stripe Checkout session.

## Page state assumed

- [x] Public (no auth required) — but the Upgrade button only fires for
      signed-in users.

## Elements

| selector / accessible name              | role                | expected behavior on interaction                   | success signal                                           | failure signal                  |
| --------------------------------------- | ------------------- | -------------------------------------------------- | -------------------------------------------------------- | ------------------------------- |
| `page.getByText(/Choose your.*plan/i)`  | heading             | renders localized heading                          | text visible                                             | shows raw `{{app}}` placeholder |
| `page.getByText(/free                   | starter/i).first()` | text                                               | tier list rendered                                       | at least one tier name shown    | no tiers (no `/api/billing/tiers` data) |
| `page.getByText(/categories/i).first()` | text                | renders the categories limit                       | text visible                                             | feature lines missing           |
| `page.getByText(/posts/i).first()`      | text                | renders the posts limit                            | text visible                                             | feature lines missing           |
| `page.getByText(/topics/i).first()`     | text                | renders the topics limit                           | text visible                                             | feature lines missing           |
| signed-in Upgrade click                 | button              | POST /api/billing/checkout returns real Stripe URL | response includes `url: 'https://checkout.stripe.com/…'` | placeholder URL or 4xx          |

## Network calls expected during normal use

| trigger              | method | path                    | what request body or query is expected                   |
| -------------------- | ------ | ----------------------- | -------------------------------------------------------- |
| initial render       | GET    | `/api/billing/tiers`    | returns array of tier definitions                        |
| Upgrade click (auth) | POST   | `/api/billing/checkout` | `{ priceId, successUrl?, cancelUrl? }` returns `{ url }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
