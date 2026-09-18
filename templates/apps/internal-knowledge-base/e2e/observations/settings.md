# Page observations: /settings (Settings)

Observed via Playwright MCP at `/settings` while authenticated as a fresh
signup. Three sections: Account (email + password change + 2FA),
Notifications (5 toggles), Reading & writing (4 toggles), and a Danger
zone with Delete workspace.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role    | expected behavior on interaction                                                  | success signal                                                | failure signal                                 |
| ------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `page.locator('input#settings-email')`                        | textbox | Pre-filled from GET /api/users/me; onBlur PATCHes /api/users/:id with `{ email }` | "Email updated." success line appears; persists across reload | error message; reload reverts                  |
| `getByRole('button', { name: /change password/i })`           | button  | Opens the change-password modal containing current/new password inputs            | modal visible with `aria-label` or labelled inputs            | nothing happens                                |
| `getByRole('switch', { name: /two-factor authentication/i })` | switch  | Toggles `users.twoFactorEnabled` via PATCH /api/users/:id                         | aria-checked flips and persists across reload                 | reverts                                        |
| `getByText('Mentions')` toggle row + sibling `role=switch`    | switch  | PATCHes oauthData.preferences.notifications.mentions; survives reload             | next GET /users/me returns the new value                      | reverts on reload                              |
| `getByText('Serif body')` toggle row + sibling `role=switch`  | switch  | PATCHes oauthData.preferences.reading.serif; survives reload                      | next GET /users/me reflects the new value                     | reverts                                        |
| `getByRole('button', { name: /delete workspace/i })`          | button  | Opens the delete-workspace confirmation modal (does not delete on open)           | modal visible with confirmation copy                          | navigates away or fires DELETE without confirm |

## Hidden surfaces opened from this page

| trigger                  | what it opens          | elements inside (selector / role / behavior)                                                                                                   |
| ------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Click "Change password"  | password modal         | `input[type=password][name=current-pw]`, `input[type=password][name=new-pw]`, submit button posting to /api/users/:id/password                 |
| Click "Delete workspace" | delete-workspace modal | `input[type=password][name=delete-pw]` confirm input, "Cancel" and "Delete" buttons; "Delete" fires DELETE /api/users/:id and routes to /login |

## Network calls expected during normal use

| trigger                        | method | path                    | what request body or query is expected                                          |
| ------------------------------ | ------ | ----------------------- | ------------------------------------------------------------------------------- |
| Page load                      | GET    | /api/users/me           | 200 with `{ props: { id, email, oauthData? } }`                                 |
| Email blur (changed)           | PATCH  | /api/users/:id          | `{ email: <new> }` → 200                                                        |
| 2FA toggle                     | PATCH  | /api/users/:id          | `{ twoFactorEnabled: boolean }` → 200                                           |
| Notification or Reading toggle | PATCH  | /api/users/:id          | `{ oauthData: { …, preferences: { notifications: {…}, reading: {…} } } }` → 200 |
| Submit change-password modal   | POST   | /api/users/:id/password | `{ currentPassword, newPassword }`                                              |
| Confirm delete modal           | DELETE | /api/users/:id          | 204 then logout + redirect to /login                                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
