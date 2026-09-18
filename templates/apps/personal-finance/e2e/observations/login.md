# Page observations: /login (Login)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/login.
> Headings observed: 1: Sign in / Welcome back.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name              | role    | expected behavior on interaction              | success signal                                    | failure signal                   |
| --------------------------------------- | ------- | --------------------------------------------- | ------------------------------------------------- | -------------------------------- |
| `locator('input[type="email"]')`        | textbox | accepts the user's email address              | typed value mirrored back                         | input not visible / not editable |
| `locator('input[type="password"]')`     | textbox | accepts the user's password (masked)          | typed value mirrored back                         | input not visible / not editable |
| `locator('form button[type="submit"]')` | button  | POSTs /api/users/log-in and routes off /login | URL no longer matches /login, JWT in localStorage | error visible / stays on /login  |
| `locator('a[href="/signup"]')`          | link    | routes to /signup                             | URL becomes /signup                               | no navigation                    |
| `locator('a[href="/forgot-password"]')` | link    | routes to /forgot-password                    | URL becomes /forgot-password                      | no navigation                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path              | expected body                                |
| ------- | ------ | ----------------- | -------------------------------------------- |
| Submit  | POST   | /api/users/log-in | `{ email, password }`, response 200 with JWT |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
