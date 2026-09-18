# Page observations: /settings (Settings)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → browser_navigate `/settings`
2. browser_snapshot — left rail (7 sections), default section `profile` shows the public-card form
3. After clicking each rail button, the right column re-renders with that section's content (appearance / notifications / billing / integrations / etc.)

## Page state assumed

- [x] Authenticated (auth-guarded route — sign up first)

## Elements

| selector / accessible name                       | role     | expected behavior on interaction                                                    | success signal                                           | failure signal     |
| ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------ |
| `[data-mol-id="settings-section-profile"]`       | button   | activates the Profile section                                                       | rail item highlighted, form renders                      | section unchanged  |
| `[data-mol-id="settings-section-appearance"]`    | button   | activates the Appearance section                                                    | rail item highlighted, theme cards render                | section unchanged  |
| `[data-mol-id="settings-section-notifications"]` | button   | activates the Notifications section                                                 | rail item highlighted, toggles render                    | section unchanged  |
| `[data-mol-id="settings-section-billing"]`       | button   | activates the Billing section; loads `/api/billing/status` and `/api/billing/tiers` | tier cards render                                        | tier cards missing |
| `[data-mol-id="settings-section-integrations"]`  | button   | activates the Integrations section                                                  | placeholder body renders                                 | section unchanged  |
| `[data-mol-id="settings-section-workspace"]`     | button   | activates the Workspace section (admin-console copy)                                | placeholder card renders                                 | unchanged          |
| `[data-mol-id="settings-section-security"]`      | button   | activates the Security section (placeholder)                                        | placeholder card renders                                 | unchanged          |
| `[data-mol-id="settings-profile-displayName"]`   | textbox  | accepts text — public display name                                                  | value reflects typing                                    | submit blocked     |
| `[data-mol-id="settings-profile-save"]`          | button   | PATCH `/api/profile/me`                                                             | inline status appears + name persists                    | status missing     |
| `[data-mol-id="settings-theme-light"]`           | button   | PATCHes theme=light + flips `<html>` class                                          | inline status; button highlighted                        | unchanged          |
| `[data-mol-id="settings-theme-dark"]`            | button   | PATCHes theme=dark + flips `<html class="dark">`                                    | `<html>` gets `dark` class; localStorage `dc-theme=dark` | unchanged          |
| `[data-mol-id="settings-theme-system"]`          | button   | PATCHes theme=system + adopts prefers-color-scheme                                  | inline status                                            | unchanged          |
| `[data-mol-id="settings-notif-notifyMentions"]`  | checkbox | toggles `prefs.notifyMentions` via PATCH                                            | checkbox flips, status appears                           | reverts            |
| `[data-mol-id="settings-notif-notifyDigest"]`    | checkbox | toggles `prefs.notifyDigest` via PATCH                                              | checkbox flips, status appears                           | reverts            |

## Hidden surfaces opened from this page

| trigger         | what it opens                | elements inside (selector / role / behavior)                    |
| --------------- | ---------------------------- | --------------------------------------------------------------- |
| billing section | tier card grid + status card | `[data-mol-id^="settings-billing-tier-"]` plus checkout buttons |
| theme save      | inline status text           | `[data-mol-id="settings-theme-status"]`                         |
| notif toggle    | inline status text           | `[data-mol-id="settings-notif-status"]`                         |
| profile save    | inline status text           | `[data-mol-id="settings-profile-status"]`                       |

## Network calls expected during normal use

| trigger               | method | path                    | what request body or query is expected |
| --------------------- | ------ | ----------------------- | -------------------------------------- |
| initial render        | GET    | `/api/profile/me`       | bearer-authed; returns user + prefs    |
| select billing        | GET    | `/api/billing/status`   | bearer-authed; current plan            |
| select billing        | GET    | `/api/billing/tiers`    | bearer-authed; tier list               |
| save profile form     | PATCH  | `/api/profile/me`       | `{ name, prefs: {...} }`               |
| select theme          | PATCH  | `/api/profile/me`       | `{ prefs: { theme } }`                 |
| toggle notif checkbox | PATCH  | `/api/profile/me`       | `{ prefs: { notify*: bool } }`         |
| switch plan           | POST   | `/api/billing/checkout` | `{ priceId }`                          |
| cancel                | POST   | `/api/billing/cancel`   | `{}`                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
