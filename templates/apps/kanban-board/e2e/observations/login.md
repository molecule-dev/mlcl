# Page observations: /login (Login)

> Filled by AI agent driving the running app on http://localhost:3020 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                | success signal               | failure signal                    |
| --------------------------------------------------------- | ------- | ----------------------------------------------- | ---------------------------- | --------------------------------- |
| `getByLabel(/Work email/i)` (autoComplete=email)          | textbox | accepts an email value                          | input has the typed value    | empty / reset                     |
| `getByLabel(/Password/i)` (autoComplete=current-password) | textbox | accepts a masked password                       | input has the typed value    | plain text / empty                |
| `getByRole("button", { name: /^Sign in$/i })`             | button  | POSTs creds; navigates to /dashboard on success | URL becomes /dashboard       | stays on /login with inline error |
| `getByRole("link", { name: /Forgot password/i })`         | link    | navigates to /forgot-password                   | URL becomes /forgot-password | stays on /login                   |
| `getByRole("link", { name: /Create one/i })` (footer)     | link    | navigates to /signup                            | URL becomes /signup          | stays on /login                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger            | method | path              | what request body or query is expected             |
| ------------------ | ------ | ----------------- | -------------------------------------------------- |
| submit valid creds | POST   | /api/users/log-in | { email, password }; response includes accessToken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
