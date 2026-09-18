# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (renders without auth; behaves slightly differently when authenticated — shows current plan)

## Elements

| selector / accessible name                                     | role                            | expected behavior on interaction                              | success signal                                     | failure signal     |
| -------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------- | -------------------------------------------------- | ------------------ |
| `getByRole("button", { name: /Toggle theme/i })`               | button                          | flips theme                                                   | `data-mol-mode` flips                              | unchanged          |
| `getByRole("button", { name: /Open user menu/i })` (auth only) | button                          | opens user dropdown                                           | menu visible                                       | nothing            |
| `getByRole("button", { name: /Current plan/i })`               | button                          | disabled — marks current tier                                 | no-op                                              | navigates anywhere |
| `getByRole("button", { name: /Upgrade to Pro/i })`             | button                          | POST `/api/billing/checkout` then redirect to Stripe Checkout | URL contains `checkout.stripe.com` AND `cs_test_…` | 5xx error          |
| `getByRole("button", { name: /Upgrade to Team/i })`            | button                          | POST `/api/billing/checkout` then redirect to Stripe Checkout | URL contains `checkout.stripe.com` AND `cs_test_…` | 5xx error          |
| `getByRole("link", { name: /Clarion/i })`                      | link `/`                        | back to landing                                               | URL `/`                                            | stays              |
| `getByRole("link", { name: /About Clarion/i })`                | link `https://www.molecule.dev` | external                                                      | new tab                                            | nothing            |
| `getByRole("button", { name: /Privacy Policy/i })`             | button                          | privacy modal/page                                            | privacy content visible                            | nothing            |
| `getByRole("button", { name: /Terms of Service/i })`           | button                          | terms modal/page                                              | terms content visible                              | nothing            |
| `getByRole("button", { name: /Language/i })`                   | button                          | locale picker                                                 | menu opens                                         | nothing            |

## Hidden surfaces opened from this page

| trigger                      | what it opens | elements inside (selector / role / behavior) |
| ---------------------------- | ------------- | -------------------------------------------- |
| Open user menu (when authed) | dropdown menu | sign out, settings link                      |

## Network calls expected during normal use

| trigger          | method | path                    | what request body or query is expected                   |
| ---------------- | ------ | ----------------------- | -------------------------------------------------------- |
| Page load        | GET    | `/api/billing/tiers`    | returns array of pricing tiers with `stripePriceId`      |
| Page load (auth) | GET    | `/api/users/me`         | returns current user incl. `planKey`                     |
| Click Upgrade    | POST   | `/api/billing/checkout` | `{ planKey, returnUrl }` body, returns `{ checkoutUrl }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
