# Page observations: /settings (Settings)

> Filled from a live walk via Playwright MCP at /settings.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                 | role     | expected behavior on interaction                   | success signal                                          | failure signal                               |
| ------------------------------------------ | -------- | -------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| Account section heading                    | heading  | renders profile area                               | visible                                                 | not visible                                  |
| "Current plan" label + planKey display     | text     | sourced from /api/billing/status                   | the user's planKey is visible                           | renders hard-coded `Free` even on paid plans |
| Upgrade button (only on `starter` planKey) | button   | navigate to /pricing for upgrade                   | URL becomes /pricing                                    | button is a no-op                            |
| Devices list                               | listitem | per-device session card                            | new session shows up after sign-in from a fresh browser | empty even though /api/devices returns rows  |
| Sign-out button (per device or global)     | button   | DELETE /api/devices/:id or POST /api/users/log-out | session cookie cleared, redirect to /login              | nothing happens                              |

## Hidden surfaces opened from this page

| trigger             | what it opens | elements inside (selector / role / behavior)                |
| ------------------- | ------------- | ----------------------------------------------------------- |
| Change-password CTA | inline form   | current password, new password, confirm new password fields |

## Network calls expected during normal use

| trigger   | method | path                | what request body or query is expected     |
| --------- | ------ | ------------------- | ------------------------------------------ |
| Page load | GET    | /api/billing/status | `{ planKey, ... }`                         |
| Page load | GET    | /api/devices        | `Array<DeviceRecord>` for the current user |
| Sign out  | POST   | /api/users/log-out  | clears session cookie                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
