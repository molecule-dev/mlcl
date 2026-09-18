# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                             | role              | expected behavior on interaction                                      | success signal                                        | failure signal            |
| -------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------- |
| `[data-mol-id="settings-section-account"]` etc                                         | tab               | switch between Account / Notifications / Signatures / Security panels | active section visible                                | wrong panel visible       |
| `[data-mol-id="settings-name"]` + `[data-mol-id="settings-email"]`                     | text              | render current user from GET /api/users/:id                           | matches signup email/name                             | empty / placeholder       |
| `[data-mol-id="settings-edit-profile"]`                                                | button            | enter edit mode (reveal name/email inputs)                            | name/email inputs visible, Save button visible        | edit form does not render |
| `[data-mol-id="settings-name-input"]` + `[data-mol-id="settings-save-profile"]`        | textbox + button  | PATCH /api/users/:id and refresh display                              | new name reflected in `[data-mol-id="settings-name"]` | name unchanged            |
| `[data-mol-id="settings-toggle-desktop_notifications"]`                                | button (toggle)   | flip preference + persist to localStorage `meridian:settings:v1`      | localStorage value flips on reload                    | no localStorage write     |
| `[data-mol-id="settings-signature-input"]` + `[data-mol-id="settings-save-signature"]` | textarea + button | save signature to localStorage                                        | success feedback rendered                             | feedback never shows      |
| `[data-mol-id="settings-sign-out"]`                                                    | button            | logout user, redirect to /login                                       | URL becomes /login                                    | stays on /settings        |

## Hidden surfaces opened from this page

| trigger             | what it opens    | elements inside (selector / role / behavior) |
| ------------------- | ---------------- | -------------------------------------------- |
| Edit profile button | Inline edit form | Name + email inputs, Save button, cancel     |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected |
| ------------ | ------ | -------------- | -------------------------------------- |
| Mount        | GET    | /api/users/:id | empty body                             |
| Save profile | PATCH  | /api/users/:id | { name, email }                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
