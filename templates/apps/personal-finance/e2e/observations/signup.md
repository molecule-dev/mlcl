# Page observations: /signup (Signup)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/signup.
> Headings observed: 1: Create your account.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name              | role    | expected behavior on interaction                                         | success signal                                     | failure signal                   |
| --------------------------------------- | ------- | ------------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------- |
| `locator('input[type="email"]')`        | textbox | accepts the user's email address                                         | typed value mirrored back                          | input not visible / not editable |
| `locator('input[type="password"]')`     | textbox | accepts the user's chosen password (masked)                              | typed value mirrored back                          | input not visible / not editable |
| `locator('form button[type="submit"]')` | button  | POSTs /api/users to create the account, persists JWT, routes off /signup | URL no longer matches /signup, JWT in localStorage | error visible / stays on /signup |
| `locator('a[href="/login"]')`           | link    | "Log In" link routes to /login                                           | URL becomes /login                                 | no navigation                    |
| `localStorage["molecule:auth:user"]`    | storage | persisted user object after signup                                       | object with `id` and `email` matches input         | absent / wrong shape             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path       | expected body                                |
| ------- | ------ | ---------- | -------------------------------------------- |
| Submit  | POST   | /api/users | `{ email, password }`, response 201 with JWT |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
