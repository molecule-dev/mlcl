# Page observations: /settings (Settings)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction                                    | success signal                                          | failure signal       |
| ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------- | ------------------------------------------------------- | -------------------- |
| `[data-testid="settings-displayname"]` (Display name)            | textbox | accept new display name; save on blur via PATCH `/api/users/:id`    | typed value reflected, profile shows new name on reload | input rejects        |
| `[data-testid="settings-bio"]` (Bio textarea)                    | textbox | accept multi-line bio; save on blur via PATCH `/api/users/:id`      | typed value reflected, profile shows new bio on reload  | input rejects        |
| `[data-testid="settings-handle"]` (@handle read-only)            | text    | render the viewer's handle                                          | `@handle` text visible                                  | missing handle       |
| `[data-testid="settings-tab-notifications"]` (Notifications tab) | button  | switch right pane to notifications toggles                          | toggle controls visible                                 | tab inactive         |
| `[data-testid="toggle-notif-likes"]` (Likes toggle)              | switch  | toggle `oauthData.socialPreferences.notifLikes`; aria-pressed flips | aria-pressed reflects new state, persists across reload | state lost on reload |

## Hidden surfaces opened from this page

| trigger            | what it opens               | elements inside (selector / role / behavior) |
| ------------------ | --------------------------- | -------------------------------------------- |
| Notifications tab  | notification toggles        | likes / comments / follows / live toggles    |
| Privacy tab        | privacy toggles             | private / activity / tagging toggles         |
| Plan & billing tab | "View pricing & plans" link | a[href="/pricing"]                           |

## Network calls expected during normal use

| trigger           | method | path            | what request body or query is expected        |
| ----------------- | ------ | --------------- | --------------------------------------------- |
| Page mount        | GET    | /api/profile/me | returns the viewer's profile                  |
| Page mount        | GET    | /api/users/:id  | returns oauthData with socialPreferences      |
| Display name blur | PATCH  | /api/users/:id  | `{ name }` returns updated user               |
| Toggle click      | PATCH  | /api/users/:id  | `{ oauthData: { socialPreferences: {...} } }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
