# Page observations: /settings (Settings)

> Filled from a live walk via Playwright MCP at /settings (after sign-up).

## Page state assumed

- [x] Authenticated (AuthGuard route)

## Elements

| selector / accessible name                                               | role            | expected behavior on interaction                                                   | success signal                                                     | failure signal   |
| ------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------- |
| `[data-mol-id=settings-display-name]` Display name input                 | textbox         | bound to local state, persisted on Save                                            | typed value reflected, persisted via PATCH `/api/users/:id`        | input rejects    |
| `[data-mol-id=settings-save-profile]` Save profile button                | button          | PATCH `/api/users/:id` with `{ name }`                                             | success toast / row updated, GET `/api/users/me` reflects new name | toast / no PATCH |
| `[data-mol-id=settings-theme-toggle]` Theme toggle                       | button          | switches between "light" and "dark", persisting via `localStorage[molecule-theme]` | new theme persists across reload                                   | reload reverts   |
| `[data-mol-id=settings-notification-pref-desktop]` Desktop notifications | checkbox/toggle | flips boolean, persists via `localStorage[team-chat:notification-prefs]`           | flag persists across reload                                        | reload reverts   |
| `[data-mol-id=settings-logout]` Log out                                  | button          | calls `authClient.logout()` then navigates to /login                               | URL becomes /login, JWT cleared from localStorage                  | toast / stays    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path           | what request body or query is expected |
| --------------------- | ------ | -------------- | -------------------------------------- |
| Save profile click    | PATCH  | /api/users/:id | `{ name }` returns updated user row    |
| Page load (logged in) | GET    | /api/users/me  | returns the current user (name, email) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
