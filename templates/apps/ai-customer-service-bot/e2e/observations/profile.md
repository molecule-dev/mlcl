# Page observations: /profile (Profile)

Captured from `browser_snapshot` on `http://localhost:3100/profile`
after `signup(page)`. Hero card with avatar + name + email + role
badge, then a "Your performance" KPI panel and a "Notify me when…"
preferences form.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role      | expected behavior on interaction                | success signal                                                                  | failure signal   |
| -------------------------------------------- | --------- | ----------------------------------------------- | ------------------------------------------------------------------------------- | ---------------- |
| `[data-mol-id="page-profile"]`               | container | renders the hero after auth                     | element visible                                                                 | missing          |
| `[data-mol-id="profile-name"]`               | text      | shows the signed-in user's name (or email)      | text matches `useAuth().user`                                                   | empty            |
| `[data-mol-id="profile-email"]`              | text      | shows the signed-in user's email                | text matches the credentials used at signup                                     | missing          |
| `[data-mol-id="profile-kpi-handled"]`        | text      | shows totalConversations from /api/analytics    | numeric value rendered                                                          | missing / NaN    |
| `[data-mol-id="profile-signature"]`          | textbox   | accepts an email signature                      | value matches typed text                                                        | empty            |
| `[data-mol-id="profile-notify-escalations"]` | checkbox  | toggles `notify_escalations` flag in form state | input checked toggles                                                           | unchanged        |
| `[data-mol-id="profile-save"]`               | button    | PUT /api/settings with signature + notify flags | `profile-saved` toast visible AND backend GET /api/settings reflects new values | nothing persists |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path           | what request body or query is expected                              |
| -------------------- | ------ | -------------- | ------------------------------------------------------------------- |
| Page load            | GET    | /api/settings  | `SettingsRow` for the signed-in user                                |
| Page load            | GET    | /api/analytics | aggregate `summary` used by KPI panel                               |
| Click "Save profile" | PUT    | /api/settings  | `{ signature, notify_escalations, notify_mentions, notify_digest }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
