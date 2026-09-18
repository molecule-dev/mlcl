# Page observations: /forgot-password (ForgotPassword)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name            | role       | expected behavior on interaction | success signal             | failure signal                                          |
| ------------------------------------- | ---------- | -------------------------------- | -------------------------- | ------------------------------------------------------- |
| `locator('input[type="email"]')`      | textbox    | accepts an email address         | value reflects typed input | input cleared / disabled                                |
| `getByRole('button', { name: /send    | reset      | continue/i })`                   | button                     | POSTs /api/users/forgot-password and shows confirmation | confirmation visible, status 2xx | error visible / 5xx |
| `getByRole('link', { name: /sign\s*in | back/i })` | link                             | navigates back to /login   | URL becomes /login                                      | stays on /forgot-password        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
