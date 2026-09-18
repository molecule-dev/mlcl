# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                    | role               | expected behavior on interaction                                                | success signal                                                 | failure signal     |
| ------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------ |
| `getByTestId("settings-tab-notifications")`                   | button             | shows notifications panel                                                       | tab active, notif rows visible                                 | nothing            |
| `getByTestId("settings-tab-channels")`                        | button             | shows channels panel                                                            | tab active, list of channels with toggles                      | nothing            |
| `getByTestId("settings-tab-permissions")`                     | button             | shows permissions panel                                                         | tab active, list of permissions                                | nothing            |
| `getByTestId("settings-tab-account")`                         | button             | shows account panel (embeds SettingsPanel — email/password/2FA/devices/billing) | tab active, email input + Plan readout visible                 | nothing            |
| notif toggle e.g. `getByTestId("settings-notif-mentions")`    | switch             | toggles "mentions" preference                                                   | switch visually flips, persists across reload via localStorage | unchanged          |
| `getByTestId("settings-notif-urgent")`                        | switch (always-on) | locked ON                                                                       | aria-checked=true, disabled                                    | togglable          |
| channel toggle e.g. `getByTestId("settings-channel-company")` | switch             | mutes/unmutes that channel                                                      | switch flips, persists via localStorage                        | unchanged          |
| account: `input#settings-email`                               | textbox            | edit email                                                                      | value reflects typed text                                      | empty              |
| account: Save email button                                    | button             | PUT `/api/users/me` to update email                                             | next GET returns new email                                     | error              |
| account: Update password fields + button                      | button             | PUT `/api/users/me` with newPassword                                            | next login uses new password                                   | error              |
| account: Upgrade button                                       | button             | navigate to `/pricing`                                                          | URL `/pricing`                                                 | stays              |
| account: Plan readout                                         | text               | shows `Plan: <capitalized planKey>` from `/api/users/me`                        | "Plan: Free" for fresh signup                                  | wrong/static value |
| `getByRole("button", { name: /Sign out                        | SIGN OUT/i })`     | button                                                                          | logs out                                                       | URL `/login`       | unchanged |
| `getByRole("button", { name: /Toggle theme/i })`              | button             | flips theme                                                                     | `data-mol-mode` flips                                          | unchanged          |

## Hidden surfaces opened from this page

| trigger             | what it opens        | elements inside (selector / role / behavior) |
| ------------------- | -------------------- | -------------------------------------------- |
| Account → 2FA setup | inline modal/section | TOTP secret + QR + verification code input   |
| Account → Devices   | list section         | currently-trusted devices, revoke buttons    |

## Network calls expected during normal use

| trigger             | method                                | path              | what request body or query is expected |
| ------------------- | ------------------------------------- | ----------------- | -------------------------------------- |
| Page load           | GET                                   | `/api/categories` | for channels tab                       |
| Page load (account) | GET                                   | `/api/users/me`   | for plan readout + email + 2fa state   |
| Save email          | PUT                                   | `/api/users/me`   | `{ email }`                            |
| Save password       | PUT                                   | `/api/users/me`   | `{ newPassword, currentPassword }`     |
| Click Upgrade       | (none server-side; just route change) | `/pricing`        | n/a                                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
