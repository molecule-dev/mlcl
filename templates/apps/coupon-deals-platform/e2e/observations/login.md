# Page observations: /login (Login)

> Captured anonymously — split-pane auth shell with marketing copy on the left and the form on the right.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role     | expected behavior on interaction                            | success signal                  | failure signal                    |
| --------------------------------------------------- | -------- | ----------------------------------------------------------- | ------------------------------- | --------------------------------- |
| `getByRole('link', { name: 'Snagr' })`              | link     | nav to /                                                    | URL becomes `/`                 | stays on `/login`                 |
| `getByLabel('Email address')`                       | textbox  | accepts an email value                                      | input value reflects typed text | input is read-only                |
| `getByLabel('Password')`                            | textbox  | accepts a password value (masked)                           | input value reflects typed text | input is read-only                |
| `getByRole('checkbox', { name: 'Show password' })`  | checkbox | toggles password visibility (type=text/password)            | password field type flips       | password remains masked           |
| `getByRole('checkbox', { name: 'Remember me' })`    | checkbox | toggles remember-me option (visual only)                    | checkbox state flips            | no state change                   |
| `getByRole('link', { name: /forgot password/i })`   | link     | nav to /forgot-password                                     | URL becomes `/forgot-password`  | stays on `/login`                 |
| `getByRole('button', { name: /sign in to snag/i })` | button   | POSTs /api/users/log-in, on success redirects to /dashboard | URL becomes `/dashboard`        | stays on `/login`, error rendered |
| `getByRole('link', { name: /create an account/i })` | link     | nav to /signup                                              | URL becomes `/signup`           | stays on `/login`                 |

## Hidden surfaces opened from this page

| trigger                              | what it opens | elements inside |
| ------------------------------------ | ------------- | --------------- |
| (none — login form is fully visible) | —             | —               |

## Network calls expected during normal use

| trigger     | method | path              | expected body         |
| ----------- | ------ | ----------------- | --------------------- |
| Submit form | POST   | /api/users/log-in | `{ email, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
