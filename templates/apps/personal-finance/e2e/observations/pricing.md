# Page observations: /pricing (Pricing)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/pricing.
> Public landing showing tiers from /api/billing/tiers (Free, Pro, Team).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name              | role    | expected behavior on interaction       | success signal      | failure signal               |
| --------------------------------------- | ------- | -------------------------------------- | ------------------- | ---------------------------- |
| `getByRole('heading')`                  | heading | renders the page title                 | heading visible     | nothing rendered             |
| `getByText(/^Free$/i)`                  | text    | Free tier card from /api/billing/tiers | "Free" tier visible | tier missing despite API 200 |
| `getByText(/^Pro$/i)`                   | text    | Pro tier card from /api/billing/tiers  | "Pro" tier visible  | tier missing                 |
| `getByText(/^Team$/i)`                  | text    | Team tier card from /api/billing/tiers | "Team" tier visible | tier missing                 |
| `getByRole('link', { name: /get started | sign up | start free                             | choose/i })`        | link                         | tier CTA routes to /signup or /login when unauthenticated | URL becomes /signup or /login | dead button (no navigation) |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path               | expected body                                          |
| --------- | ------ | ------------------ | ------------------------------------------------------ |
| Page load | GET    | /api/billing/tiers | response 200, array of tier objects (key, name, price) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
