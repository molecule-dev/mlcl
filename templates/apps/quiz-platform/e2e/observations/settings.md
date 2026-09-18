# Page observations: /settings

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Authenticated.

## Elements

| selector / accessible name                                | role             | expected behavior on interaction                                     | success signal                                                                                                            | failure signal        |
| --------------------------------------------------------- | ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `getByTestId('settings')`                                 | landmark `<div>` | rendered                                                             | element visible                                                                                                           | missing               |
| `getByRole('link', { name: /sparq home/i })`              | link             | navigate to /                                                        | URL = /                                                                                                                   | otherwise             |
| `getByRole('button', { name: /toggle theme/i })`          | button           | flips data-theme                                                     | data-theme attr changes                                                                                                   | unchanged             |
| `getByRole('button', { name: /open user menu/i })`        | button           | opens user-menu popover                                              | popover visible                                                                                                           | missing               |
| `getByTestId('profile-name')`                             | text             | shows current display name                                           | text matches user.name                                                                                                    | empty                 |
| `getByTestId('edit-profile')`                             | button           | toggles inline edit form                                             | form `data-testid=profile-form` becomes visible                                                                           | unchanged             |
| `getByTestId('profile-name-input')`                       | input text       | accepts text inside edit form                                        | DOM value matches typed                                                                                                   | missing               |
| `getByTestId('profile-username-input')`                   | input text       | accepts text                                                         | DOM value matches typed                                                                                                   | missing               |
| `getByTestId('profile-save')`                             | submit           | PATCH /api/users/{userId} `{ name, username }`; closes form          | `data-testid=profile-message` shows "Saved.", form hidden, GET /api/users/{userId} reflects new values (read-after-write) | error message visible |
| Preference toggle `getByTestId('pref-haptics')`           | toggle button    | toggles boolean in localStorage `sparq:prefs:v1`, aria-pressed flips | aria-pressed flips, localStorage value flips                                                                              | unchanged             |
| Preference toggle `getByTestId('pref-liveSounds')`        | toggle button    | toggles boolean                                                      | aria-pressed flips                                                                                                        | unchanged             |
| Preference toggle `getByTestId('pref-notifications')`     | toggle button    | toggles boolean                                                      | aria-pressed flips                                                                                                        | unchanged             |
| Preference toggle `getByTestId('pref-showInLeaderboard')` | toggle button    | toggles boolean                                                      | aria-pressed flips                                                                                                        | unchanged             |
| `getByTestId('delete-account')`                           | button           | switches to confirm mode (Yes/Cancel)                                | confirm + cancel buttons visible                                                                                          | unchanged             |
| `getByTestId('cancel-delete')`                            | button           | returns to default state                                             | back to single delete button                                                                                              | unchanged             |
| `getByTestId('confirm-delete')`                           | button           | DELETE /api/users/{userId}, logout(), redirect to /                  | URL = /, bearer cleared from localStorage, subsequent GET /api/users (no auth) returns 401                                | otherwise             |
| `getByRole('link', { name: /privacy/i })`                 | link             | /privacy                                                             | URL changes                                                                                                               | otherwise             |
| `getByRole('link', { name: /terms/i })`                   | link             | /terms                                                               | URL changes                                                                                                               | otherwise             |
| `getByRole('button', { name: /language/i })`              | button           | language switcher                                                    | popover visible                                                                                                           | no popover            |

## Hidden surfaces opened from this page

| trigger               | what it opens      | elements inside                               |
| --------------------- | ------------------ | --------------------------------------------- |
| Edit profile button   | inline form        | name input, username input, save submit       |
| Delete account button | inline confirm row | confirm button, cancel button                 |
| Open user menu        | popover            | Profile / Settings / Notifications / Sign out |

## Network calls expected during normal use

| trigger        | method | path                | body / query                                   |
| -------------- | ------ | ------------------- | ---------------------------------------------- |
| Save profile   | PATCH  | /api/users/{userId} | `{ name, username }`; 200 returns updated user |
| Confirm delete | DELETE | /api/users/{userId} | 204; bearer cleared on logout                  |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] every preference toggle round-tripped
- [x] profile edit/save round-tripped (read-after-write)
- [x] delete-account flow with confirm + cancel covered
- [x] all rows have a corresponding test in `e2e/settings.spec.ts`
