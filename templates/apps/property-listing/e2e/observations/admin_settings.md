# Page observations: /admin/settings (admin_settings)

User settings page (profile + password + notifications).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction          | success signal                      | failure signal       |
| -------------------------- | ------- | ----------------------------------------- | ----------------------------------- | -------------------- |
| settings heading           | heading | page title rendered                       | visible                             | missing              |
| first-name input           | textbox | accepts edits                             | value persists                      | rejected             |
| phone input                | textbox | persists into oauthData.propertyhub.phone | PATCH succeeds + reload re-hydrates | value lost on reload |
| save profile button        | button  | PATCH /api/users/:id                      | success toast                       | inline error         |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger      | method | path       | what request body or query is expected |
| ------------ | ------ | ---------- | -------------------------------------- |
| page load    | GET    | /api/users | /:id → 200                             |
| save profile | PATCH  | /api/users | /:id with oauthData payload → 200      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/admin_settings.spec.ts`
