# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the running app on http://localhost:3020 with
> the recovery link (token in querystring).

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role    | expected behavior on interaction                                    | success signal                      | failure signal                             |
| ------------------------------------------------------------ | ------- | ------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------ |
| `getByLabel(/Work email/i)` (autoComplete=email)             | textbox | accepts an email value (prefilled from ?email=)                     | input has the typed/prefilled value | empty / reset                              |
| `getByLabel(/Recovery code/i)`                               | textbox | accepts the token from email link or paste (prefilled from ?token=) | input has the value                 | empty                                      |
| `getByLabel(/New password/i)` (autoComplete=new-password)    | textbox | accepts a masked new password                                       | input has the typed value           | plain text / empty                         |
| `getByRole("button", { name: /Reset password & sign in/i })` | button  | confirms reset, then logs in, then redirects to /dashboard          | URL becomes /dashboard              | stays on /reset-password with inline error |
| `getByRole("link", { name: /^Sign in$/i })` (footer)         | link    | navigates to /login                                                 | URL becomes /login                  | stays on /reset-password                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                    | what request body or query is expected             |
| ----------- | ------ | ----------------------- | -------------------------------------------------- |
| submit form | PATCH  | /api/users/:id/password | { token, password }; response 200                  |
| then        | POST   | /api/users/log-in       | { email, password }; response includes accessToken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
