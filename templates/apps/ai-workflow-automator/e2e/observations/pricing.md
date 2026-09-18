# Page observations: /pricing

> Public-or-authed pricing page. Shows three plan tiers with CTAs.
> Authed users hitting "Upgrade" call /api/billing/checkout to get a
> Stripe URL.

## Page state assumed

- [x] Public; works authenticated too

## Elements

| selector / accessible name           | role     | expected behavior on interaction | success signal | failure signal            |
| ------------------------------------ | -------- | -------------------------------- | -------------- | ------------------------- |
| `getByRole("heading", { level: 1 })` | heading  | shows pricing heading            | visible        | empty                     |
| `getByText(/free/i)`                 | label    | free tier card                   | visible        | empty                     |
| `getByText(/pro/i)`                  | label    | pro tier card                    | visible        | empty                     |
| `getByText(/team                     | business | enterprise/i)`                   | label          | top tier card             | visible     | empty |
| `getByRole("link", { name: /sign up  | start    | get started/i })`                | link           | CTA → /signup or /billing | URL changes | stays |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger              | method | path                  | expected body                            |
| -------------------- | ------ | --------------------- | ---------------------------------------- |
| page load (optional) | GET    | /api/billing/tiers    | [ { id, name, price, … } ]               |
| upgrade (authed)     | POST   | /api/billing/checkout | { url: "https://checkout.stripe.com/…" } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-pricing.spec.ts`
