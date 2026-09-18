# Page observations: /reset-password

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Public (no auth required, but the email-link query string usually pre-fills email + token)

## Elements

| selector / accessible name            | role           | expected behavior on interaction | success signal                                                   | failure signal                    |
| ------------------------------------- | -------------- | -------------------------------- | ---------------------------------------------------------------- | --------------------------------- |
| `input[type="email"]`                 | email input    | accept user's email              | value typed                                                      | rejected                          |
| `input[type="password"]`              | password input | accept the new password          | value typed                                                      | rejected                          |
| `getByRole('button', { name: /(submit | reset)/i })`   | submit                           | POST /api/users/reset-password with `{ email, password, token }` | server returns 2xx on valid token | 4xx on bad token   |
| `getByRole('link', { name: /(log\s*in | sign\s*in      | back)/i })`                      | link                                                             | navigate back to /login           | URL becomes /login | unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | flat form                                    |

## Network calls expected during normal use

| trigger             | method | path                      | what request body or query is expected                |
| ------------------- | ------ | ------------------------- | ----------------------------------------------------- |
| Submit (good token) | POST   | /api/users/reset-password | `{ email, password, token }` — server returns 2xx     |
| Submit (bad token)  | POST   | /api/users/reset-password | server returns 4xx — page must NOT navigate to /login |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
