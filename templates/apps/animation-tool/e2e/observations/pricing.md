# Page observations: /pricing (Pricing)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction                                                             | success signal                     | failure signal  |
| ---------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- | ---------------------------------- | --------------- |
| `getByRole('heading', { name: /Choose your.*plan/i, level: 1 })` | heading | render pricing hero                                                                          | visible                            | absent          |
| `getByRole('button', { name: /Current plan/i })`                 | button  | indicate the user's current tier (disabled CTA on the free tier)                             | rendered                           | not rendered    |
| `getByRole('button', { name: /Upgrade to Pro/i })`               | button  | when authed: POST /api/billing/checkout → redirect to Stripe; when public: redirect to login | redirected to /login or stripe URL | nothing happens |
| `getByRole('button', { name: /Upgrade to Team/i })`              | button  | when authed: POST /api/billing/checkout → redirect to Stripe; when public: redirect to login | redirected to /login or stripe URL | nothing happens |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected |
| ------------- | ------ | --------------------- | -------------------------------------- |
| page load     | GET    | /api/billing/tiers    | (none)                                 |
| Upgrade click | POST   | /api/billing/checkout | { priceId }                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
