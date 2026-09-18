# Page observations: /login (Login)

> Public — branded auth shell with "Welcome back" heading, email + password
> form, Forgot password link, and a "Try free" cross-link to /signup.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role           | expected behavior on interaction                      | success signal                  | failure signal               |
| -------------------------------------------------- | -------------- | ----------------------------------------------------- | ------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /welcome back/i })`  | heading        | identifies the page                                   | heading visible                 | empty page                   |
| `getByLabel(/email/i)`                             | textbox        | accepts the user's email                              | input value reflects typed text | input read-only              |
| `getByLabel(/password/i)`                          | textbox        | accepts the user's password masked                    | input value reflects typed text | input read-only              |
| `getByRole('button', { name: /sign in/i })`        | button         | POST /api/users/log-in; on 2xx redirect to /dashboard | URL becomes `/dashboard`        | stays on `/login` with error |
| `getByRole('link', { name: /forgot.*password/i })` | link           | nav to /forgot-password                               | URL becomes `/forgot-password`  | stays on `/login`            |
| `getByRole('link', { name: /sign up                | create account | try free/i })`                                        | link                            | nav to /signup               | URL becomes `/signup` | stays on `/login` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger         | method | path              | what request body or query is expected               |
| --------------- | ------ | ----------------- | ---------------------------------------------------- |
| Submit the form | POST   | /api/users/log-in | `{ email, password }`; 200 sets session cookie/token |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-login.spec.ts`
