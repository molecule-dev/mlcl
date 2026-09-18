# Page observations: /pricing (Pricing)

Source: live walk via Playwright + e2e/pricing.spec.ts. The page is
rendered by `<PricingPage>` from `@molecule/app-billing-react`, which
fetches plan tiers from `GET /api/billing/tiers`.

## Page state assumed

- [x] Public (no auth required to view; checkout requires auth)

## Elements

| selector / accessible name                                  | role     | expected behavior on interaction                    | success signal                      | failure signal                                                                             |
| ----------------------------------------------------------- | -------- | --------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `getByRole('heading', { level: 1 })`                        | heading  | page renders "Choose your … plan" h1                | h1 visible, app name interpolated   | empty / placeholder                                                                        |
| Plan cards: free / pro / team                               | section  | three tier cards render with their headline + price | all three labels visible            | one or more missing                                                                        |
| Limits list per card (accounts/cards/statements/etc.)       | list     | each card shows a `<ul>` of feature/limit lines     | every card has limits-list children | bullets missing                                                                            |
| `getByRole('button', { name: /sign up/i })` (free tier CTA) | button   | unauth user → links to /signup                      | URL becomes /signup                 | URL unchanged                                                                              |
| `getByRole('button', { name: /upgrade                       | continue | subscribe/i })` (paid tier)                         | button                              | logged-in user clicking pro/team triggers a POST /api/billing/checkout, returns Stripe URL | network capture shows POST /api/billing/checkout | no checkout call |
| Period toggle (monthly / yearly) if shown                   | toggle   | flipping period changes shown prices                | both labels appear at some point    | toggle inert                                                                               |

## Hidden surfaces opened from this page

| trigger                                            | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — pure pricing grid; no modals on this page) | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                  | what request body or query is expected  |
| ---------------------- | ------ | --------------------- | --------------------------------------- |
| initial load           | GET    | /api/billing/tiers    | 200 with array of plan tier definitions |
| paid plan CTA (authed) | POST   | /api/billing/checkout | { tier, period } → 200 with checkoutUrl |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
