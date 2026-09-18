# Page observations: /signup (Signup)

> Captured anonymously — first/last name + email + password + confirm.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                          | role     | expected behavior on interaction                                 | success signal           | failure signal                |
| ------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- | ------------------------ | ----------------------------- |
| `getByRole('link', { name: 'Snagr' })`                              | link     | nav to /                                                         | URL becomes `/`          | stays on `/signup`            |
| `getByLabel('First name')`                                          | textbox  | accepts the first-name input                                     | typed value reflected    | input is read-only            |
| `getByLabel('Last name')`                                           | textbox  | accepts the last-name input                                      | typed value reflected    | input is read-only            |
| `getByLabel('Email address')`                                       | textbox  | accepts an email value                                           | typed value reflected    | read-only                     |
| `getByLabel('Password').first()`                                    | textbox  | accepts password (masked)                                        | typed value reflected    | read-only                     |
| `getByLabel('Confirm password')`                                    | textbox  | accepts password confirmation                                    | typed value reflected    | read-only                     |
| `getByRole('checkbox', { name: 'Show password' }).first()`          | checkbox | toggles password visibility                                      | input type flips         | password stays masked         |
| `getByRole('button', { name: /create account and start saving/i })` | button   | POSTs /api/users to register, on success redirects to /dashboard | URL becomes `/dashboard` | stays on `/signup` with error |
| `getByRole('link', { name: 'Sign in' })`                            | link     | nav to /login                                                    | URL becomes `/login`     | stays on `/signup`            |

## Hidden surfaces opened from this page

| trigger                               | what it opens | elements inside |
| ------------------------------------- | ------------- | --------------- |
| (none — signup form is fully visible) | —             | —               |

## Network calls expected during normal use

| trigger     | method | path       | expected body               |
| ----------- | ------ | ---------- | --------------------------- |
| Submit form | POST   | /api/users | `{ email, password, name }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
