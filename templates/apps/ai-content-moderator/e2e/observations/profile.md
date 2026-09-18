# Page observations: /profile (Profile)

Source: live walk via Playwright + e2e/profile.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name     | role             | expected behavior on interaction                                              | success signal                                                       | failure signal              |
| ------------------------------ | ---------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------- |
| prefilled fields render        | textbox          | `#profile-name` and `#profile-email` are pre-populated from signed-in user    | both inputs match `signup()` data                                    | empty / wrong values        |
| `#profile-name` + Save changes | textbox + button | PATCH /api/users/:id `{name}` then reload — name persists                     | 200 PATCH response, "Profile saved" banner, value retained on reload | error banner, value reverts |
| `#profile-tz` selector         | combobox         | choose Europe/Berlin → localStorage prefs updated → persists across reload    | reloaded select still on Europe/Berlin                               | resets to default           |
| `#profile-role` selector       | combobox         | choose Senior moderator → localStorage prefs updated → persists across reload | reloaded select still on Senior moderator                            | resets to default           |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger           | method | path           | what request body or query is expected        |
| ----------------- | ------ | -------------- | --------------------------------------------- |
| save profile      | PATCH  | /api/users/:id | { name, email } → 200 with updated user props |
| reload after save | GET    | /api/users/:id | 200 with updated name/email                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
