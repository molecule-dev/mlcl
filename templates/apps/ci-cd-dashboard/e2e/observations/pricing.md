# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (renders user's current plan as "Current plan")

## Elements

| selector / accessible name                                       | role              | expected behavior on interaction                            | success signal                                             | failure signal |
| ---------------------------------------------------------------- | ----------------- | ----------------------------------------------------------- | ---------------------------------------------------------- | -------------- |
| `getByRole('heading', { name: /Choose your.*plan/i, level: 1 })` | heading           | renders page title                                          | heading visible                                            | absent         |
| `getByRole('heading', { name: /^Free$/i })`                      | heading           | shows free plan card                                        | heading visible                                            | absent         |
| `getByRole('heading', { name: /^Pro$/i })`                       | heading           | shows pro plan card                                         | heading visible                                            | absent         |
| `getByRole('heading', { name: /^Team$/i })`                      | heading           | shows team plan card                                        | heading visible                                            | absent         |
| free `getByRole('button', { name: /Current plan/i })`            | button (disabled) | non-interactive — shows current plan                        | button has disabled attr                                   | enabled        |
| pro `getByRole('button', { name: /Upgrade to Pro/i })`           | button            | POST /api/billing/checkout?planKey=pro, redirect to Stripe  | URL becomes Stripe domain or response includes session URL | error toast    |
| team `getByRole('button', { name: /Upgrade to Team/i })`         | button            | POST /api/billing/checkout?planKey=team, redirect to Stripe | URL becomes Stripe domain or response includes session URL | error toast    |
| feature listitems per plan                                       | listitem          | shows tier limits                                           | items visible (artifacts/builds/pipelines counts)          | empty          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger          | method | path                  | what request body or query is expected |
| ---------------- | ------ | --------------------- | -------------------------------------- |
| Page load (auth) | GET    | /api/billing/tiers    | none                                   |
| Page load (auth) | GET    | /api/billing/status   | none                                   |
| Click upgrade    | POST   | /api/billing/checkout | { planKey }                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
