# Page observations: /pricing (Pricing) — covered by 11-pricing.spec.ts

> Public marketing page rendering the tier ladder declared in
> api/src/tiers.ts (Free / Pro / Team) with month/yearly variants. The
> shared `PricingPage` component from `@molecule/app-billing-react` reads
> tiers from GET /api/billing/tiers; "Upgrade" buttons on paid tiers
> POST /api/billing/checkout (Stripe Checkout session) and redirect.

## Page state assumed

- [x] Public (no auth required for browse — auth required for upgrade)

## Elements

| selector / accessible name     | role   | expected behavior on interaction        | success signal | failure signal |
| ------------------------------ | ------ | --------------------------------------- | -------------- | -------------- |
| `getByText(/^free$/i).first()` | text   | renders Free tier card                  | visible        | absent         |
| `getByText(/^pro$/i).first()`  | text   | renders Pro tier card                   | visible        | absent         |
| `getByText(/^team$/i).first()` | text   | renders Team tier card                  | visible        | absent         |
| `getByRole('button')` (any)    | button | renders at least one upgrade/choose CTA | count ≥ 1      | none           |
| `getByText(/documents/i)`      | text   | tier limits include "documents"         | visible        | absent         |

## Hidden surfaces opened from this page

| trigger                   | what it opens               | elements inside     |
| ------------------------- | --------------------------- | ------------------- |
| Click upgrade on Pro/Team | redirect to Stripe Checkout | external Stripe URL |

## Network calls expected during normal use

| trigger          | method | path                  | expected body                     |
| ---------------- | ------ | --------------------- | --------------------------------- |
| Page load (auth) | GET    | /api/billing/tiers    | array of tier definitions         |
| Click Upgrade    | POST   | /api/billing/checkout | `{ tier, period }` → checkout URL |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-pricing.spec.ts`
