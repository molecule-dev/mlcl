# Page observations: /settings (Settings)

> Authenticated profile/preferences surface. On mount: GET /api/users/me.
> Display-name + email are persisted server-side via PATCH /api/users/:id;
> bio + diet + notification toggles persist to localStorage. Account
> delete DELETEs /api/users/:id. Spec: e2e/11-settings.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name        | role    | expected behavior on interaction     | success signal                               | failure signal    |
| --------------------------------- | ------- | ------------------------------------ | -------------------------------------------- | ----------------- |
| `[data-testid="settings-name"]`   | textbox | accepts display name                 | value committed                              | nothing typed     |
| `[data-testid="settings-email"]`  | textbox | accepts email                        | value committed                              | nothing typed     |
| `[data-testid="settings-bio"]`    | textbox | accepts bio                          | value persists to localStorage               | nothing committed |
| `[data-testid="settings-save"]`   | button  | PATCHes /api/users/:id               | "Settings saved" message + reload-persistent | error             |
| `[data-testid="settings-saved"]`  | text    | success surface                      | visible after save                           | absent            |
| `[data-testid="settings-delete"]` | button  | DELETEs /api/users/:id after confirm | redirect to /                                | row still present |

## Hidden surfaces opened from this page

| trigger               | what it opens  | elements inside           |
| --------------------- | -------------- | ------------------------- |
| Delete account button | window.confirm | OK / Cancel native dialog |

## Network calls expected during normal use

| trigger   | method | path           | expected body                |
| --------- | ------ | -------------- | ---------------------------- |
| Page load | GET    | /api/users/me  | user object (props envelope) |
| Save      | PATCH  | /api/users/:id | { name?, email? }            |
| Delete    | DELETE | /api/users/:id | empty body                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-settings.spec.ts`
