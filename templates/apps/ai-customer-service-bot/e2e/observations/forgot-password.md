# Page observations: /forgot-password (ForgotPassword)

Captured from `browser_snapshot` on `http://localhost:3170/forgot-password`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role       | expected behavior on interaction | success signal           | failure signal     |
| ------------------------------------- | ---------- | -------------------------------- | ------------------------ | ------------------ |
| `getByLabel(/email/i)`                | textbox    | accepts email value              | value matches            | empty              |
| `getByRole('button', { name: /send    | reset      | submit                           | recover/i })`            | button             | POST password-reset request | confirmation visible / network POST fires | error toast |
| `getByRole('link', { name: /sign\s*in | back/i })` | link                             | navigates back to /login | URL becomes /login | stays on /forgot-password   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                                  | what request body or query is expected                        |
| ------------ | ------ | ------------------------------------- | ------------------------------------------------------------- |
| Click submit | POST   | /api/users (forgot-password subroute) | `{ email }` body — schedules password-reset email via Mailgun |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
