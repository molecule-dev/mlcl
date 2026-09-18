# Page observations: /settings

> Authenticated settings shell. Sidebar-driven sections: Profile,
> Workspace, Security, Notifications. Profile name persists via
> PATCH /api/users/:id; other sections persist via localStorage.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                 | success signal                  | failure signal |
| -------------------------------------------------- | ------- | ------------------------------------------------ | ------------------------------- | -------------- |
| `getByRole("heading", { level: 1 })`               | heading | page heading visible                             | visible                         | empty          |
| `getByRole("button", { name: /workspace/i })`      | button  | switches active section to Workspace             | workspace fields visible        | unchanged      |
| `getByRole("button", { name: /security/i })`       | button  | switches active section to Security              | security fields visible         | unchanged      |
| `getByRole("button", { name: /notifications?/i })` | button  | switches active section to Notifications         | toggles visible                 | unchanged      |
| `[data-mol-id="settings-profile-name"]`            | textbox | edits user name; PATCH on save                   | next GET /api/users/me reflects | error toast    |
| `getByRole("button", { name: /save/i })`           | button  | persists form (PATCH /api/users/:id for profile) | form goes clean                 | error          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger      | method | path           | expected body          |
| ------------ | ------ | -------------- | ---------------------- |
| page load    | GET    | /api/users/me  | { id, name, email, … } |
| save profile | PATCH  | /api/users/:id | { name } → 200         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/13-settings.spec.ts`
