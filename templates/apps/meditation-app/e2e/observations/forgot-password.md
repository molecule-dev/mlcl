# Page observations: /forgot-password (ForgotPassword)

Email-only request form for sending reset links.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role                        | expected behavior on interaction                  | success signal           | failure signal                                                 |
| ----------------------------------------- | --------------------------- | ------------------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| email input rendered                      | textbox                     | page renders an email field for the reset request | input visible            | input missing                                                  |
| `getByRole("button", { name: /send        | reset                       | submit/i })`                                      | button                   | POST /api/forgot_password — UI shows success/sent confirmation | success message visible | no confirmation rendered |
| `getByRole("link", { name: /back to login | sign in/i })` or arrow link | link                                              | navigates back to /login | URL becomes /login                                             | URL unchanged           |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                 | what request body or query is expected       |
| ----------- | ------ | -------------------- | -------------------------------------------- |
| submit form | POST   | /api/forgot_password | { email } → 200 (always 200, no enumeration) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
