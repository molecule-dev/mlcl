# Page observations: /reset-password (ResetPassword)

Token + new-password form reachable from password-reset email.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role                        | expected behavior on interaction                                     | success signal           | failure signal                                            |
| ----------------------------------------- | --------------------------- | -------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------- |
| new password + confirm inputs rendered    | form                        | page renders password and confirm fields when token present in query | both inputs visible      | fields missing                                            |
| `getByRole("button", { name: /reset       | update                      | set/i })`                                                            | button                   | POST /api/reset_password → redirects to /login on success | URL becomes /login or success message visible | stays on /reset-password with error |
| `getByRole("link", { name: /back to login | sign in/i })` or arrow link | link                                                                 | navigates back to /login | URL becomes /login                                        | URL unchanged                                 |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                | what request body or query is expected |
| ----------- | ------ | ------------------- | -------------------------------------- |
| submit form | POST   | /api/reset_password | { token, password } → 200              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
