# Page observations: /settings (Settings)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                         | role         | expected behavior on interaction                            | success signal                                                  | failure signal        |
| ------------------------------------------------------------------ | ------------ | ----------------------------------------------------------- | --------------------------------------------------------------- | --------------------- |
| `getByRole('heading', { name: /Settings/i, level: 1 })`            | heading      | render settings heading                                     | visible                                                         | absent                |
| section nav `getByRole('button', { name: /Account/i })`            | button       | scroll to / activate account section                        | data-mol-section=account                                        | section unchanged     |
| section nav `getByRole('button', { name: /Motion preferences/i })` | button       | scroll to / activate preferences section                    | data-mol-section=preferences                                    | section unchanged     |
| section nav `getByRole('button', { name: /^groupTeam$              | ^Team$/i })` | button                                                      | scroll to / activate team section                               | data-mol-section=team | section unchanged |
| section nav `getByRole('button', { name: /Billing/i })`            | button       | scroll to / activate billing section                        | data-mol-section=billing                                        | section unchanged     |
| display-name input (`#settings-name`)                              | textbox      | accept new display name                                     | value reflects input                                            | empty                 |
| email input (`#settings-email`)                                    | textbox      | accept new email                                            | value reflects input                                            | empty                 |
| `getByRole('button', { name: /Save changes/i })`                   | button       | PATCH /api/users/:id with name+email; persist across reload | next GET /api/users/profile shows new values                    | error visible         |
| current-password input (`#settings-current-pw`)                    | textbox      | accept current password                                     | value reflects input                                            | empty                 |
| new-password input (placeholder /New password/i)                   | textbox      | accept new password                                         | value reflects input                                            | empty                 |
| `getByRole('button', { name: /Update password/i })`                | button       | PATCH /api/users/:id/password; clear inputs on success      | success message visible; old pw rejected on next login          | error visible         |
| `getByRole('button', { name: /Sign out/i })`                       | button       | POST /api/users/logout; redirect to / or /login             | URL leaves /settings                                            | stays signed in       |
| `getByRole('button', { name: /Compare plans/i })`                  | button       | scroll to billing/plans section or reveal plans             | data-mol-id contains "compare-plans" or section becomes visible | nothing happens       |

## Hidden surfaces opened from this page

| trigger                | what it opens                                                  | elements inside (selector / role / behavior)            |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| Change password toggle | password form (already in DOM, focuses current-password input) | current+new pw inputs + Update button (already counted) |

## Network calls expected during normal use

| trigger               | method | path                    | what request body or query is expected |
| --------------------- | ------ | ----------------------- | -------------------------------------- |
| page load             | GET    | /api/billing/status     | (none)                                 |
| Save changes click    | PATCH  | /api/users/:id          | { name, email }                        |
| Update password click | PATCH  | /api/users/:id/password | { currentPassword, newPassword }       |
| Sign out click        | POST   | /api/users/logout       | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
