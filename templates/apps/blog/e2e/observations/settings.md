# Page observations: /settings (Account settings)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/settings. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role       | expected behavior on interaction                                    | success signal                                            | failure signal    |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------- | --------------------------------------------------------- | ----------------- |
| Page heading "Settings" (SettingsPageHeader)             | heading    | renders page title                                                  | visible                                                   | missing           |
| `[data-mol-id="settings-message"]` (when present)        | alert      | renders save success/error notice                                   | visible after Save                                        | absent on success |
| Profile section: name input                              | textbox    | accepts the user's display name                                     | input editable                                            | not editable      |
| Profile section: bio textarea                            | textbox    | accepts the user's bio                                              | input editable                                            | not editable      |
| Profile section: email (readonly)                        | textbox    | shows the signed-in email                                           | populated                                                 | empty             |
| Appearance section: theme radio (light/dark/system)      | radiogroup | flips theme on change                                               | document.documentElement.dataset.theme updates            | unchanged         |
| Appearance section: font-size radio (small/medium/large) | radiogroup | flips font-size scale                                               | dataset.fontSize updates                                  | unchanged         |
| Notifications: "New followers" toggle                    | switch     | flips newFollowers state, persists on Save                          | aria-checked toggles                                      | unchanged         |
| Notifications: "Comments" toggle                         | switch     | flips commentsNotif state                                           | aria-checked toggles                                      | unchanged         |
| Notifications: "Mentions" toggle                         | switch     | flips mentionsNotif state                                           | aria-checked toggles                                      | unchanged         |
| Privacy: "Profile visible" toggle                        | switch     | flips profileVisible                                                | aria-checked toggles                                      | unchanged         |
| Privacy: "Show email" toggle                             | switch     | flips showEmail                                                     | aria-checked toggles                                      | unchanged         |
| Save button (Top bar AND Form footer)                    | button     | PATCH /api/users/:id (name) + PATCH /api/profile/preferences (rest) | success message visible, /api/profile/me reflects changes | error message     |
| Cancel button (Form footer)                              | button     | clears local message                                                | message cleared                                           | unchanged         |
| Danger zone: Delete account                              | button     | window.confirm + DELETE /api/users/:id                              | redirects to / on success                                 | error message     |

## Hidden surfaces opened from this page

| trigger        | what it opens           | elements inside               |
| -------------- | ----------------------- | ----------------------------- |
| Delete account | window.confirm() dialog | OK / Cancel — OK fires DELETE |

## Network calls expected during normal use

| trigger        | method | path                     | what request body or query is expected                                                          |
| -------------- | ------ | ------------------------ | ----------------------------------------------------------------------------------------------- |
| page load      | GET    | /api/profile/me          | hydrate name + preferences                                                                      |
| Save           | PATCH  | /api/users/:id           | { name }                                                                                        |
| Save           | PATCH  | /api/profile/preferences | { theme, fontSize, bio, profileVisible, showEmail, newFollowers, commentsNotif, mentionsNotif } |
| Delete account | DELETE | /api/users/:id           | no body                                                                                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
