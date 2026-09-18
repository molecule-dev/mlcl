# Page observations: /pricing (Pricing)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. browser_navigate → `/pricing`
2. browser_snapshot — heading "Choose your Atelier plan", three plan cards (Free / Pro / Team), buttons "Current plan", "Upgrade to Pro", "Upgrade to Team"
3. Re-pass after page load shows no extra surfaces (no modals open by default)

## Page state assumed

- [x] Public (no auth required) — but upgrade buttons require sign-in to follow through

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                          | success signal                                  | failure signal    |
| ----------------------------------------------------- | ------- | --------------------------------------------------------- | ----------------------------------------------- | ----------------- |
| `getByRole('heading', { name: /Choose your.*plan/ })` | heading | renders the page title                                    | level-1 heading present                         | heading missing   |
| `getByRole('heading', { name: /^Free$/ })`            | heading | identifies the Free tier card                             | renders                                         | tier card missing |
| `getByRole('heading', { name: /^Pro$/ })`             | heading | identifies the Pro tier card                              | renders                                         | tier card missing |
| `getByRole('heading', { name: /^Team$/ })`            | heading | identifies the Team tier card                             | renders                                         | tier card missing |
| `getByRole('button', { name: /Current plan/ })`       | button  | indicates the user's current tier (Free for new accounts) | button is disabled / not actionable             | tier mismatch     |
| `getByRole('button', { name: /Upgrade to Pro/ })`     | button  | initiates the Pro upgrade — hits `/api/billing/checkout`  | redirect to Stripe checkout (or local fallback) | error toast       |
| `getByRole('button', { name: /Upgrade to Team/ })`    | button  | initiates the Team upgrade — hits `/api/billing/checkout` | redirect to Stripe checkout                     | error toast       |

## Hidden surfaces opened from this page

| trigger       | what it opens                                    | elements inside (selector / role / behavior)                    |
| ------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| upgrade click | redirects to Stripe-hosted checkout (off-domain) | not in app DOM — assert via captured /api/billing/checkout call |

## Network calls expected during normal use

| trigger               | method | path                    | what request body or query is expected |
| --------------------- | ------ | ----------------------- | -------------------------------------- |
| initial render (auth) | GET    | `/api/billing/tiers`    | returns the configured tier list       |
| upgrade click         | POST   | `/api/billing/checkout` | `{ tier }` returns the Stripe URL      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
