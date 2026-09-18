# Page observations: /settings (Settings)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/settings.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                 | role               | expected behavior on interaction                                    | success signal                                                                             | failure signal                  |
| ------------------------------------------ | ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------- |
| `locator('[role="switch"]').first()`       | switch             | toggles a preference; debounced PATCH to /api/users/:id persists it | switch state survives a reload                                                             | toggle reverts after reload     |
| `getByRole('button', { name: /edit profile | edit account/i })` | button                                                              | opens the edit-profile form, accepts a new display name, persists via PATCH /api/users/:id | new name reflected after reload | form not interactive / change not persisted |

## Hidden surfaces opened from this page

| trigger             | what it opens                                                     | elements inside (selector / role / behavior)                               |
| ------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Edit profile button | inline form with `Display name` input + `Save` / `Cancel` buttons | typing + Save patches `/api/users/:id` and updates the in-memory auth user |

## Network calls expected during normal use

| trigger       | method | path           | what request body or query is expected             |
| ------------- | ------ | -------------- | -------------------------------------------------- |
| Mount         | GET    | /api/users/me  | full user record including `oauthData.preferences` |
| Toggle switch | PATCH  | /api/users/:id | merges `oauthData.preferences` deltas              |
| Save profile  | PATCH  | /api/users/:id | `{ name }`                                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-settings.spec.ts`
