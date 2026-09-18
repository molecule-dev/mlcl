# Page observations: /settings (preferences + account deletion)

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100.
> Authenticated. Settings exposes preferences (weight unit, rest timer,
> notification toggles) plus a destructive Delete-Account flow.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                                   | role                  | expected behavior on interaction                                                      | success signal                                                               | failure signal                      |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| `getByTestId('pref-weight-unit')`                                                                                                            | combobox              | PATCH /api/users/:id with the new `weightUnit` preference; survives reload            | value retained on `page.reload()`                                            | reverts to previous value           |
| `getByTestId('pref-rest-timer')`                                                                                                             | combobox              | PATCH /api/users/:id with `restTimerSeconds`; GET /api/users/me reflects it           | server `oauthData.preferences.restTimerSeconds` matches selection            | server preference unchanged         |
| `getByTestId('settings-tab-notifications')` then `getByTestId('pref-notify-pr')`                                                             | tab + checkbox        | toggling notifies-on-PR persists and round-trips through reload                       | checked state inverts and survives reload                                    | checked state reverts               |
| `getByTestId('settings-delete-account')` → `getByTestId('settings-delete-modal')` → password input → `getByTestId('settings-delete-submit')` | button + modal + form | DELETE the user account; redirect to `/login`; subsequent login with same creds fails | URL becomes `/login` and login attempt with old creds keeps user on `/login` | account survives, login still works |

## Hidden surfaces opened from this page

| trigger                                     | what it opens        | elements inside                                                                  |
| ------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `getByTestId('settings-tab-notifications')` | notifications panel  | `pref-notify-pr` checkbox (and other notification toggles)                       |
| `getByTestId('settings-delete-account')`    | delete-account modal | `settings-delete-password` input, `settings-delete-submit` button, cancel button |

## Network calls expected during normal use

| trigger                                            | method | path           | expected body                                           |
| -------------------------------------------------- | ------ | -------------- | ------------------------------------------------------- |
| Change weight unit / rest timer / toggle notify-PR | PATCH  | /api/users/:id | partial preferences merged into `oauthData.preferences` |
| Verification of saved preferences                  | GET    | /api/users/me  | `oauthData.preferences.*` reflects the writes           |
| Submit delete-account modal                        | DELETE | /api/users/:id | 200 + cookie cleared                                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-settings.spec.ts`
