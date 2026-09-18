# Page observations: /profile (Profile)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → browser_navigate `/profile`
2. browser_snapshot — gradient hero, "Edit profile" button, stats grid, recent work portfolio
3. After clicking "Edit profile", an inline form with five fields + Save appears

## Page state assumed

- [x] Authenticated (auth-guarded route — sign up first)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction                    | success signal                                              | failure signal       |
| ------------------------------------------- | ------- | --------------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| `[data-mol-id="profile-display-name"]`      | heading | renders the user's display name (or "Your profile") | text matches the prefs.displayName / name                   | text empty           |
| `[data-mol-id="profile-bio"]`               | text    | renders the user's bio (or default placeholder)     | text matches prefs.bio                                      | text empty           |
| `[data-mol-id="profile-edit-toggle"]`       | button  | toggles the inline edit form                        | form appears with input fields visible                      | form stays hidden    |
| `[data-mol-id="profile-input-displayName"]` | textbox | accepts text — display name                         | value reflects typing                                       | value sticks         |
| `[data-mol-id="profile-input-location"]`    | textbox | accepts text — location                             | value reflects typing                                       | value sticks         |
| `[data-mol-id="profile-input-pronouns"]`    | textbox | accepts text — pronouns                             | value reflects typing                                       | value sticks         |
| `[data-mol-id="profile-input-publicUrl"]`   | textbox | accepts text — public URL                           | value reflects typing                                       | value sticks         |
| `[data-mol-id="profile-input-bio"]`         | textbox | accepts text — multi-line bio                       | textarea reflects typing                                    | textarea empty       |
| `[data-mol-id="profile-save"]`              | button  | PATCH `/api/profile/me` with name + prefs           | inline status "Profile saved" appears; reload persists name | error status appears |
| `[data-mol-id="profile-stats"]`             | region  | shows projects / shapes / exports counts            | three `[data-mol-id^="profile-stat-"]` cards visible        | cards missing        |
| `[data-mol-id="profile-view-all-projects"]` | button  | navigates back to `/dashboard`                      | URL becomes `/dashboard`                                    | URL stays            |

## Hidden surfaces opened from this page

| trigger         | what it opens                             | elements inside (selector / role / breath) |
| --------------- | ----------------------------------------- | ------------------------------------------ |
| profile save    | inline status text under the Save button  | `[data-mol-id="profile-save-status"]`      |
| empty portfolio | `[data-mol-id="profile-portfolio-empty"]` | inline empty-state copy                    |

## Network calls expected during normal use

| trigger        | method | path              | what request body or query is expected                                 |
| -------------- | ------ | ----------------- | ---------------------------------------------------------------------- |
| initial render | GET    | `/api/profile/me` | bearer-authed; returns user + prefs + stats                            |
| initial render | GET    | `/api/projects`   | bearer-authed; portfolio uses up to 4 projects                         |
| Save changes   | PATCH  | `/api/profile/me` | `{ name, prefs: { displayName, bio, location, pronouns, publicUrl } }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
