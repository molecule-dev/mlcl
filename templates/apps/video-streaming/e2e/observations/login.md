# Page observations: /login (Log in)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/login.

## Page state assumed

- [x] Anonymous (no auth required)

## Elements

| selector / accessible name                        | role                 | expected behavior on interaction  | success signal                                      | failure signal                  |
| ------------------------------------------------- | -------------------- | --------------------------------- | --------------------------------------------------- | ------------------------------- |
| `getByLabel(/email/i)`                            | textbox              | accepts the existing user's email | typed value mirrored                                | input missing                   |
| `getByLabel(/^password$/i)`                       | textbox              | accepts the password              | typed value mirrored                                | input missing                   |
| `getByRole('button', { name: /log in              | sign in/i })`        | button                            | POST /api/auth/login, redirects to /home on success | URL becomes /home with auth set | 401 response or stuck on /login |
| `getByRole('link', { name: /sign up               | create account/i })` | link                              | navigates to /signup                                | URL becomes /signup             | no navigation                   |
| `getByRole('link', { name: /forgot password/i })` | link                 | navigates to /forgot-password     | URL becomes /forgot-password                        | no navigation                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path            | what request body or query is expected |
| ------- | ------ | --------------- | -------------------------------------- |
| Submit  | POST   | /api/auth/login | `{ email, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
