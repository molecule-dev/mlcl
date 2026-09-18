# Page observations: /reset-password (ResetPassword)

## Page state assumed

- [x] Public (no auth required) — driven by an email link with a token query param

## Elements

| selector / accessible name            | role     | expected behavior on interaction | success signal | failure signal                 |
| ------------------------------------- | -------- | -------------------------------- | -------------- | ------------------------------ |
| `getByLabel(/^password$/i)`           | textbox  | accepts new password (masked)    | value typed    | too-short rejected             |
| `getByRole('button', { name: /reset   | update   | change/i })`                     | button         | POST /api/users/reset-password | 200 + redirect to /login | 4xx + inline error |
| `getByRole('link', { name: /sign\s*in | log\s*in | back/i })` first                 | link           | navigates back to /login       | URL becomes /login       | no nav             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                      | what request body or query is expected |
| ----------- | ------ | ------------------------- | -------------------------------------- |
| submit form | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
