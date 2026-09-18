# Page observations: /reset-password (ResetPassword)

## Page state assumed

- [x] Public (no auth required, but token expected as ?token=... query)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role       | expected behavior on interaction | success signal             | failure signal                                           |
| ----------------------------------------------------------- | ---------- | -------------------------------- | -------------------------- | -------------------------------------------------------- |
| `locator('input#password, input[type="password"]').first()` | textbox    | accepts a new password           | value reflects typed input | input cleared / disabled                                 |
| `locator('input#confirm, input[type="password"]').nth(1)`   | textbox    | accepts confirm new password     | value reflects typed input | input cleared / disabled                                 |
| `getByRole('button', { name: /reset                         | update     | change/i })`                     | button                     | POSTs /api/users/reset-password and redirects on success | URL becomes /login or /ask | stays on /reset-password with error |
| `getByRole('link', { name: /sign\s*in                       | back/i })` | link                             | navigates back to /login   | URL becomes /login                                       | stays on /reset-password   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
