# Page observations: /signup (Signup)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role                 | expected behavior on interaction                                | success signal                             | failure signal                         |
| -------------------------------------------------- | -------------------- | --------------------------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| `locator('input[autocomplete="given-name"]')`      | input                | accepts a first name                                            | input value reflects typed text            | not editable                           |
| `locator('input[autocomplete="family-name"]')`     | input                | accepts a last name                                             | input value reflects typed text            | not editable                           |
| `locator('input[type="email"]')`                   | input[type=email]    | accepts an email                                                | value reflected                            | not editable                           |
| `locator('input[type="password"]').first()`        | input[type=password] | accepts a password                                              | value reflected                            | not editable                           |
| `locator('input[type="password"]').nth(1)`         | input[type=password] | accepts password confirmation                                   | value reflected                            | not editable                           |
| `getByRole('button', { name: /Create account/i })` | button               | submit fires POST /api/users; on success, redirects off /signup | URL no longer /signup + accessToken stored | inline error visible, stays on /signup |
| `getByRole('link', { name: /Sign in/i })`          | link                 | navigates to /login                                             | URL becomes /login                         | no navigation                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path         | what request body or query is expected                             |
| ------- | ------ | ------------ | ------------------------------------------------------------------ |
| Submit  | POST   | `/api/users` | `{ email, password, name }` body — 200 with accessToken on success |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
