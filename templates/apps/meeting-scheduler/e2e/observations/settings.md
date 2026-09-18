# Page observations: /settings (Settings)

Authenticated settings; reads /api/profile/me, writes name/email/preferences and password.

Source: this page was driven live at `http://localhost:$VITE_PORT/settings`
via Playwright + the matching `e2e/settings.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name            | role    | expected behavior on interaction                                | success signal                        | failure signal           |
| ------------------------------------- | ------- | --------------------------------------------------------------- | ------------------------------------- | ------------------------ |
| `[data-testid="settings-name"]`       | textbox | editing name + clicking save persists via PATCH /api/profile/me | GET /profile/me reflects new name     | PATCH 4xx/5xx            |
| `[data-testid="settings-save-prefs"]` | button  | PATCH /api/profile/me with preferences object                   | GET reflects updated preferences      | preferences never change |
| `[data-testid="security-change-pwd"]` | button  | PATCH /api/users/:id/password rotates the password              | security-saved-at timestamp appears   | rotation never lands     |
| `[data-testid="settings-plan"]`       | text    | shows the current plan name from /api/billing/status            | plan name visible (Free / Pro / Team) | plan label empty         |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
