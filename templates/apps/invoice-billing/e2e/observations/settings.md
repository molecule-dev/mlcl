# Page observations: /settings (Settings)

> Multi-section settings page with left-rail navigation: Profile,
> Business info, Branding, Payment methods, Tax rates, Notifications,
> Subscription. Initial load fires four GETs:
> `/api/profile/me`, `/api/billing/status`, `/api/billing/tiers`,
> `/api/tax-rates`. Save changes posts to `/api/profile/me` and the
> updated values must round-trip through reload.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                             | role    | expected behavior on interaction                                                  | success signal                                   | failure signal     |
| ---------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------ |
| `getByRole('heading', { name: /^Settings$/ })`                         | heading | static title                                                                      | visible                                          | missing            |
| `getByLabel(/Display name/)`                                           | textbox | accepts text; persisted via /api/profile/me PATCH on Save                         | value retained AFTER reload                      | reload reverts     |
| `getByLabel(/Email/)`                                                  | textbox | shows authenticated email                                                         | value matches signup email                       | mismatched / empty |
| `getByLabel(/Default currency/)`                                       | textbox | accepts currency code (USD/EUR/…)                                                 | value retained after reload                      | reverts            |
| `getByLabel(/Invoice prefix/)`                                         | textbox | accepts prefix string                                                             | value retained after reload                      | reverts            |
| `getByRole('button', { name: /Save changes/ })`                        | button  | PATCHes /api/profile/me with current form state                                   | feedback visible AND reload preserves the change | error banner       |
| `getByRole('button', { name: /storefrontBusiness info/ })` (left rail) | button  | switches active section to Business info                                          | section heading swap                             | no swap            |
| `getByRole('button', { name: /paletteBranding/ })`                     | button  | switches active section to Branding                                               | section heading swap                             | no swap            |
| `getByRole('button', { name: /percentTax rates/ })`                    | button  | switches active section to Tax rates; renders tax-rate list from `/api/tax-rates` | section visible with at least one demo tax rate  | empty / 404        |
| `getByRole('button', { name: /workspace_premiumSubscription/ })`       | button  | switches to Subscription; loads `/api/billing/status` and `/api/billing/tiers`    | "free" tier label visible by default             | error              |

## Hidden surfaces opened from this page

| trigger              | what it opens | elements inside (selector / role / behavior)      |
| -------------------- | ------------- | ------------------------------------------------- |
| Tax rates section    | inline list   | rows for each demo tax rate from `/api/tax-rates` |
| Subscription section | tier ladder   | upgrade buttons that POST `/api/billing/checkout` |

## Network calls expected during normal use

| trigger                | method       | path                | what request body or query is expected                    |
| ---------------------- | ------------ | ------------------- | --------------------------------------------------------- |
| initial mount          | GET          | /api/profile/me     | profile + preferences (display name, currency, prefix, …) |
| initial mount          | GET          | /api/billing/status | `{ planKey, status }`                                     |
| initial mount          | GET          | /api/billing/tiers  | tier ladder                                               |
| initial mount          | GET          | /api/tax-rates      | array of tax rates for the user                           |
| Save changes (Profile) | PATCH or PUT | /api/profile/me     | updated profile fields                                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
