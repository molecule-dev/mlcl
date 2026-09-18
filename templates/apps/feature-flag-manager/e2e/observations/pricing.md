# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required) — but logged-in users see "Upgrade" CTAs that hit billing

## Elements

| selector / accessible name                                                      | role                              | expected behavior on interaction                       | success signal                                   | failure signal                    |
| ------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------ | ------------------------------------------------ | --------------------------------- |
| `getByRole('heading', { level: 1, name: /pricing/i })` or pricing intro heading | heading                           | render pricing intro                                   | visible                                          | absent                            |
| `getByText(/free/i)` (Free tier card)                                           | card                              | display Free tier limits ("5 flags", "5 environments") | visible                                          | absent                            |
| `getByText(/pro/i)` (Pro tier card)                                             | card                              | display Pro tier limits ("500 flags")                  | visible                                          | absent                            |
| `getByText(/team/i)` (Team tier card)                                           | card                              | display Team tier limits ("Unlimited flags")           | visible                                          | absent                            |
| `getByRole('button', { name: /upgrade.*pro                                      | choose.*pro/i })` (authenticated) | button                                                 | POST /api/billing/checkout → Stripe Checkout URL | response contains real Stripe URL | non-200, no URL |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger              | method | path                  | what request body or query is expected  |
| -------------------- | ------ | --------------------- | --------------------------------------- |
| page load            | GET    | /api/billing/tiers    | (none) — returns array of tier metadata |
| Upgrade click (auth) | POST   | /api/billing/checkout | { tierKey, billingPeriod }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-pricing.spec.ts`
