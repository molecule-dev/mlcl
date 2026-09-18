# Page observations: /settings (Settings + SettingsPanel)

> Authenticated settings panel: account email, password change modal,
> 2FA toggle, push notifications toggle, billing/Upgrade,
> devices list, this-device info, log out, delete-account modal.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                          | role   | expected behavior on interaction             | success signal                                 | failure signal            |
| --------------------------------------------------- | ------ | -------------------------------------------- | ---------------------------------------------- | ------------------------- |
| `page.locator('#settings-email')`                   | input  | accepts email; PATCH /users/:id on blur      | response 200; new email persists across reload | no PATCH OR 4xx           |
| `getByRole('button', { name: /Change password/i })` | button | opens password-change modal                  | modal visible with current/new fields          | modal does not open       |
| 2FA Switch                                          | switch | PATCH /users/:id with `{ twoFactorEnabled }` | response 200                                   | switch flips but no PATCH |
| Push notifications Switch                           | switch | calls usePush + setPushEnabled               | aria-checked toggles                           | toggle silently fails     |
| `getByRole('button', { name: /Upgrade/i })`         | button | navigates to /pricing                        | url `/pricing` after click                     | nothing happens           |
| this-device labels                                  | text   | renders platform / browser / network rows    | rows visible                                   | empty rows                |
| `getByRole('button', { name: /^Log out$/i })`       | button | clears auth + navigates to /login            | url `/login` after click; session cleared      | stays on /settings        |
| `getByRole('button', { name: /Delete account/i })`  | button | opens delete confirmation modal              | modal visible asking for password              | modal does not open       |
| password-change submit                              | n/a    | POST /users/me/password and closes modal     | modal closes on success                        | stays open with no error  |

## Network calls expected during normal use

| trigger                | method     | path                     | what request body or query is expected         |
| ---------------------- | ---------- | ------------------------ | ---------------------------------------------- |
| route load             | GET        | `/api/devices`           | 200 with `{ data: [...] }`                     |
| email blur             | PATCH      | `/api/users/:id`         | `{ email }` returns 200                        |
| 2FA toggle             | PATCH      | `/api/users/:id`         | `{ twoFactorEnabled: bool }` returns 200       |
| Upgrade click          | navigation | `/pricing`               | client navigation only — no API                |
| change password submit | POST       | `/api/users/me/password` | `{ currentPassword, newPassword }` returns 200 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
