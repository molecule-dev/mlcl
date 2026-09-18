# Page observations: /signup (Sign up)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/signup.

## Page state assumed

- [x] Anonymous (no auth required)

## Elements

| selector / accessible name            | role                 | expected behavior on interaction             | success signal                                         | failure signal                                   |
| ------------------------------------- | -------------------- | -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `getByLabel(/email/i)`                | textbox              | accepts the new user's email; required field | typed value mirrored                                   | input missing                                    |
| `getByLabel(/^password$/i)`           | textbox              | accepts the password; required field         | typed value mirrored                                   | input missing                                    |
| `getByRole('button', { name: /sign up | create account/i })` | button                                       | POST /api/auth/register, redirects to /home on success | URL becomes /home and a JWT cookie/header is set | 4xx response or stuck on /signup |
| `getByRole('link', { name: /log in    | sign in              | already have an account/i })`                | link                                                   | navigates to /login                              | URL becomes /login               | no navigation |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path               | what request body or query is expected |
| ------- | ------ | ------------------ | -------------------------------------- |
| Submit  | POST   | /api/auth/register | `{ email, password, name? }`           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
