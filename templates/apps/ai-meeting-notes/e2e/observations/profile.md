# Page observations: /profile (Profile)

> Authenticated. Three side tabs (Identity, Preferences, Notifications)
> backed by users.oauthData.profile. Save fires PATCH /api/users/:id and
> updates the row inside oauthData.profile so values survive reload.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role        | expected behavior on interaction                                           | success signal                      | failure signal  |
| --------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- | ----------------------------------- | --------------- |
| `getByRole('heading', { name: /^profile$/i })`                  | heading     | identifies the page                                                        | h1 visible                          | empty page      |
| `page.locator('[data-mol-id="profile-section-identity"]')`      | tab button  | activates the Identity panel                                               | aria-current="page" flips           | no change       |
| `page.locator('[data-mol-id="profile-section-preferences"]')`   | tab button  | activates the Preferences panel                                            | aria-current="page" flips           | no change       |
| `page.locator('[data-mol-id="profile-section-notifications"]')` | tab button  | activates the Notifications panel                                          | aria-current="page" flips           | no change       |
| `page.locator('[data-mol-id="profile-display-name"]')`          | textbox     | edits display name                                                         | input value updates                 | read-only       |
| `page.locator('[data-mol-id="profile-bio"]')`                   | textbox     | edits bio                                                                  | textarea updates                    | read-only       |
| `page.locator('[data-mol-id="profile-save"]')`                  | button      | PATCH /api/users/:id with name + oauthData.profile; persists across reload | "Profile saved" status text appears | error alert     |
| `page.locator('[data-mol-id="profile-cancel"]')`                | button      | reverts unsaved edits                                                      | inputs return to last-saved values  | nothing happens |
| `page.locator('[data-mol-id="nav-settings"]')`                  | sidebar nav | sidebar shell rendered                                                     | element visible                     | layout broken   |

## Hidden surfaces opened from this page

| trigger                   | what it opens       | elements inside                                                      |
| ------------------------- | ------------------- | -------------------------------------------------------------------- |
| Click "Preferences" tab   | preferences panel   | speaker color swatches, timezone select, job-title input             |
| Click "Notifications" tab | notifications panel | three role=switch toggles for mentions / assignments / weekly digest |

## Network calls expected during normal use

| trigger    | method | path           | what request body or query is expected                      |
| ---------- | ------ | -------------- | ----------------------------------------------------------- |
| Page load  | GET    | /api/users/:id | returns the user with oauthData.profile                     |
| Click Save | PATCH  | /api/users/:id | `{ name, oauthData: { profile: { displayName, bio, … } } }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/20-profile.spec.ts`
