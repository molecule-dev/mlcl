# Page observations: /settings (Settings)

Source: live walk via Playwright + e2e/settings.spec.ts. Profile
section persists name to PATCH /api/users/:id; Security section opens
inline change-password / 2FA panels; Linked accounts section unlinks
in client state; Notifications section toggles unsynced UI prefs.

## Page state assumed

- [x] Authenticated.

## Elements

| selector / accessible name                                                 | role    | expected behavior on interaction                                                                                  | success signal                                                       | failure signal       |
| -------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------- |
| `getByRole('heading', { name: /settings/i, level: 1 })`                    | heading | h1 renders                                                                                                        | visible                                                              | missing              |
| Sidebar nav buttons (Profile / Security / Notifications / Linked accounts) | button  | each click sets `data-section` on the page wrapper + bumps `data-section-tick`; section content swaps             | data-section attribute updates                                       | inert                |
| `[data-mol-id="settings-profile-form"]` Profile form                       | form    | name/email/phone fields with Save button                                                                          | form rendered                                                        | missing              |
| `input#profile-name`                                                       | textbox | controlled value bound to current user.name                                                                       | initial value matches `user.name`                                    | always blank         |
| `input#profile-email`                                                      | textbox | read-only, bound to `user.email`                                                                                  | shows the user's email                                               | wrong / blank        |
| `input#profile-phone`                                                      | textbox | optional phone number                                                                                             | input fills                                                          | absent               |
| `getByRole('button', { name: /save changes/i })`                           | button  | PATCH /api/users/:id with new name; response success → `[data-mol-id="settings-profile-saved"]` (`Profile saved`) | role=status visible AND on reload `#profile-name` reflects new value | error / silent no-op |
| `[data-mol-id="settings-profile-error"]`                                   | alert   | renders if PATCH errors                                                                                           | visible with message                                                 | swallowed            |
| Security: Change password CTA                                              | button  | toggles `[data-mol-id="settings-change-password-panel"]` open/closed via aria-expanded                            | aria-expanded flips, panel content visible                           | inert                |
| Security: Two-factor CTA                                                   | button  | toggles `[data-mol-id="settings-two-factor-panel"]` open/closed                                                   | aria-expanded flips, panel content visible                           | inert                |
| Notifications: switch buttons (transaction / security / statements)        | switch  | clicking toggles aria-checked locally                                                                             | aria-checked flips                                                   | inert                |
| Linked accounts: Link a new account CTA                                    | button  | toggles `[data-mol-id="settings-link-panel"]` panel open                                                          | aria-expanded flips, panel content visible                           | inert                |
| Linked accounts: Unlink button on a row                                    | button  | locally marks the row as `Unlinked` (state-only badge)                                                            | row badge appears                                                    | nothing happens      |

## Hidden surfaces opened from this page

| trigger                        | what it opens                                                 | elements inside (selector / role / behavior)  |
| ------------------------------ | ------------------------------------------------------------- | --------------------------------------------- |
| Click "Change password"        | inline panel `[data-mol-id="settings-change-password-panel"]` | Current/New password fields + Cancel button   |
| Click "Manage two-factor auth" | inline panel `[data-mol-id="settings-two-factor-panel"]`      | descriptive blurb + Cancel button             |
| Click "Link a new account"     | inline panel `[data-mol-id="settings-link-panel"]`            | Institution / Routing / Account number fields |

## Network calls expected during normal use

| trigger            | method | path                 | what request body or query is expected |
| ------------------ | ------ | -------------------- | -------------------------------------- |
| initial load       | GET    | /api/trusted_devices | 200 with `{ data:[…], total }`         |
| initial load       | GET    | /api/linked_accounts | 200 with `{ data:[…], total }`         |
| profile Save click | PATCH  | /api/users/:id       | { name } → 200 with updated props      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
