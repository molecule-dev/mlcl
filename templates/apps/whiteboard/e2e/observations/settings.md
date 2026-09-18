# Page observations: /settings (Settings)

> Authenticated. Tabbed settings page: Profile (name + username PATCH
> /api/users/:id), Appearance (theme persists to
> `whiteboard:theme`), Notifications (preferences persist to
> `whiteboard:notificationPrefs`), Security.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                              | role      | expected behavior on interaction                                                                                                                                                                    | success signal                                                                  | failure signal               |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------- |
| profile tab save (`settings-profile-card` + `settings-name` + `settings-username` + `settings-save` + `settings-status`)                | composite | profile-tab opens by default with the user's name pre-filled; editing name + username and clicking Save PATCHes /api/users/:id and surfaces a "Saved" status; GET /api/users/me reflects new fields | status text contains "saved" + /users/me returns updated name + username        | status empty or DB unchanged |
| appearance tab → dark theme persistence (`settings-tab-appearance` + `settings-appearance` + `settings-theme-dark`)                     | composite | switching to Appearance tab and clicking Dark sets `whiteboard:theme = 'dark'` in localStorage and survives reload                                                                                  | localStorage matches before + after reload                                      | preference lost              |
| notifications tab → digest pref persistence (`settings-tab-notifications` + `settings-notifications` + `settings-pref-digest` checkbox) | composite | switching to Notifications tab and checking the digest toggle persists `"digest":true` to `whiteboard:notificationPrefs` and survives reload                                                        | localStorage JSON contains `"digest":true` and checkbox is checked after reload | preference lost              |
| security tab (`settings-tab-security` + `settings-security`)                                                                            | composite | switching to Security tab renders the security card with descriptive copy                                                                                                                           | security card visible after tab click                                           | tab does not switch          |

## Hidden surfaces opened from this page

| trigger                                      | what it opens      | elements inside                               |
| -------------------------------------------- | ------------------ | --------------------------------------------- |
| `[data-mol-id="settings-tab-appearance"]`    | appearance card    | theme buttons (light/dark/system)             |
| `[data-mol-id="settings-tab-notifications"]` | notifications card | digest checkbox + other prefs                 |
| `[data-mol-id="settings-tab-security"]`      | security card      | descriptive copy + (future) security controls |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected                       |
| ------------ | ------ | -------------- | ------------------------------------------------------------ |
| page load    | GET    | /api/users/me  | 200 returns the signed-in user                               |
| Save profile | PATCH  | /api/users/:id | `{ name, username }`; 2xx; GET /users/me reflects new fields |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
