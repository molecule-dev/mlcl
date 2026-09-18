# Page observations: /settings (Settings)

> Filled by AI agent driving the running smoke app on 3020/4020 with a
> headless playwright walk (see `scripts/_tt-walk-pages.mjs`), then
> re-validated by `e2e/07-settings.spec.ts` and `e2e/billing.spec.ts`.
> Snapshot raw output at `.observe/time-tracking/settings.snapshot.txt`.

> Auth-protected. Three left-rail tabs: Profile (default) / Billing /
> Security. Profile shows display name + username + read-only email +
> Save changes. Billing shows current plan + Free / Pro / Team tier
> cards with monthly prices and "Choose plan" CTAs that hit
> /api/billing/checkout. Security shows current + new password fields.

## Procedure

1. Sign up first via `signup(page)` (route is auth-protected).
2. `mcp__playwright__browser_navigate` → `/settings`
3. `mcp__playwright__browser_snapshot` → walk every node on Profile.
4. Click `settings-tab-billing` → re-snapshot.
5. Click `settings-tab-security` → re-snapshot.
6. Re-pass: navigate again, confirm no new elements appear.
7. Author `e2e/07-settings.spec.ts` (and `billing.spec.ts` for the
   billing tab interactions).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).

## Elements

| selector / accessible name                    | role               | expected behavior on interaction                                           | success signal                                                        | failure signal                   |
| --------------------------------------------- | ------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| `[data-test=settings-page]`                   | container          | renders the settings root                                                  | element visible                                                       | missing                          |
| `heading "Settings"` (h1)                     | heading            | page title visible                                                         | h1 visible                                                            | missing                          |
| `[data-test=settings-tab-profile]`            | button             | activates profile panel (default)                                          | profile form visible                                                  | hidden                           |
| `[data-test=settings-tab-billing]`            | button             | activates billing panel                                                    | `billing-status` becomes visible                                      | not shown                        |
| `[data-test=settings-tab-security]`           | button             | activates security panel                                                   | `password-form` becomes visible                                       | not shown                        |
| `[data-test=profile-form]`                    | form               | wraps profile fields and Save                                              | form visible on Profile tab                                           | missing                          |
| `[data-test=profile-name]`                    | textbox            | Display name (editable)                                                    | typed value preserved + persisted across reload via PUT /api/users/me | missing                          |
| `[data-test=profile-username]`                | textbox            | Username (editable)                                                        | typed value preserved + persisted across reload                       | missing                          |
| `[data-test=profile-email]`                   | textbox (readOnly) | Email (read-only)                                                          | value === user.email; not editable                                    | editable                         |
| `[data-test=profile-save]`                    | button             | PUT /api/users/me with current form values                                 | toast / status reflects success and survives reload                   | error / no persistence           |
| `[data-test=billing-status]` (Billing tab)    | container          | shows current plan label (defaults to Free)                                | "Current plan" + tier name visible                                    | missing                          |
| `[data-test=billing-tier-free]` (Billing tab) | card               | renders the Free tier with "Current" badge for new users                   | tier visible + Current badge for free user                            | missing                          |
| `[data-test=billing-tier-pro]` (Billing tab)  | card               | renders the Pro tier with $15/mo price                                     | tier visible + price visible                                          | missing                          |
| `[data-test=billing-cta-pro]` (Billing tab)   | button             | POST /api/billing/checkout with Pro priceId, navigates to Stripe Checkout  | navigation to checkout.stripe.com                                     | error toast                      |
| `[data-test=billing-tier-team]` (Billing tab) | card               | renders the Team tier with $49/mo price                                    | tier visible + price visible                                          | missing                          |
| `[data-test=billing-cta-team]` (Billing tab)  | button             | POST /api/billing/checkout with Team priceId, navigates to Stripe Checkout | navigation to checkout.stripe.com                                     | error toast                      |
| `[data-test=password-form]` (Security tab)    | form               | wraps password fields                                                      | visible on Security tab                                               | missing                          |
| `[data-test=password-current]` (Security tab) | textbox (password) | Current password input                                                     | typed                                                                 | missing                          |
| `[data-test=password-new]` (Security tab)     | textbox (password) | New password input                                                         | typed                                                                 | missing                          |
| `[data-test=password-save]` (Security tab)    | button             | PUT /api/users/me/password — disabled when fields empty                    | enabled when both filled, posts on click                              | always disabled / always enabled |

## Hidden surfaces opened from this page

| trigger                 | what it opens  | elements inside (selector / role / behavior)                                                                          |
| ----------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `settings-tab-billing`  | Billing panel  | `billing-status`, `billing-tier-free`, `billing-tier-pro`, `billing-cta-pro`, `billing-tier-team`, `billing-cta-team` |
| `settings-tab-security` | Security panel | `password-form`, `password-current`, `password-new`, `password-save`                                                  |

## Network calls expected during normal use

| trigger            | method | path                                    | what request body or query is expected                            |
| ------------------ | ------ | --------------------------------------- | ----------------------------------------------------------------- |
| load               | GET    | /api/profile/me (or /api/users/me)      | current user profile to seed the form                             |
| Profile tab load   | GET    | /api/billing/status, /api/billing/tiers | (also fetched eagerly so the Billing tab renders without a flash) |
| `profile-save`     | PUT    | /api/users/me                           | `{ name?, username? }`                                            |
| `billing-cta-pro`  | POST   | /api/billing/checkout                   | `{ priceId: <STRIPE_TIME_TRACKING_PRO_MONTHLY> }`                 |
| `billing-cta-team` | POST   | /api/billing/checkout                   | `{ priceId: <STRIPE_TIME_TRACKING_TEAM_MONTHLY> }`                |
| `password-save`    | PUT    | /api/users/me/password                  | `{ currentPassword, newPassword }`                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-settings.spec.ts` or `e2e/billing.spec.ts`
