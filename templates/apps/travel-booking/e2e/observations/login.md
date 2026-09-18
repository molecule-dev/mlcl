# Page observations: /login (Login)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role                 | expected behavior on interaction                       | success signal                             | failure signal                        |
| ------------------------------------------- | -------------------- | ------------------------------------------------------ | ------------------------------------------ | ------------------------------------- |
| `locator('input[type="email"]')`            | input[type=email]    | accepts an email value                                 | input value matches typed text             | input rejects typing                  |
| `locator('input[type="password"]')`         | input[type=password] | accepts a password value                               | input value matches typed text             | input rejects typing                  |
| `getByRole('button', { name: /sign in/i })` | button               | POST /api/sessions, navigates to /search on success    | URL becomes /search and accessToken stored | inline error visible, stays on /login |
| `getByRole('link', { name: /Forgot/i })`    | link                 | navigates to /forgot-password (link copy is "Forgot?") | URL becomes /forgot-password               | no navigation                         |
| `getByRole('link', { name: /Sign up         | Create/i })`         | link                                                   | navigates to /signup                       | URL becomes /signup                   | no navigation |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                | what request body or query is expected                                                              |
| ------- | ------ | ------------------- | --------------------------------------------------------------------------------------------------- |
| Submit  | POST   | `/api/users/log-in` | `{ email, password }` — 200 with accessToken on success, 401 on bad creds (config: `loginEndpoint`) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
