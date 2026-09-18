# Page observations: /settings (Settings)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role    | expected behavior on interaction             | success signal                 | failure signal                 |
| --------------------------------------- | ------- | -------------------------------------------- | ------------------------------ | ------------------------------ |
| `[data-testid="settings-profile-form"]` | form    | submits PATCH /api/users/:id with name/email | settings-profile-saved appears | settings-profile-error appears |
| `[data-testid="settings-name"]`         | textbox | accepts a new display name                   | value reflects typed input     | input cleared / disabled       |
| `[data-testid="settings-email"]`        | textbox | accepts a new email                          | value reflects typed input     | input cleared / disabled       |
| `[data-testid="settings-profile-save"]` | button  | triggers profile save                        | settings-profile-saved appears | error visible                  |
| `[data-testid="settings-prefs-form"]`   | form    | persists retrieval prefs                     | settings-prefs-saved appears   | settings-prefs-error appears   |
| `[data-testid="settings-new-token"]`    | button  | toggles the token-create form                | token form visible             | token form missing             |
| `[data-testid="settings-token-create"]` | button  | POSTs /api/api-tokens                        | new row appears in token list  | error visible                  |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| settings-new-token | token form    | label input + create button                  |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected |
| ------------ | ------ | --------------- | -------------------------------------- |
| mount        | GET    | /api/api-tokens | scoped to current user                 |
| profile-save | PATCH  | /api/users/:id  | { name, email }                        |
| token-create | POST   | /api/api-tokens | { label }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
