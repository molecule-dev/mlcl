# Page observations: /forgot-password (ForgotPassword)

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role     | expected behavior on interaction | success signal | failure signal                  |
| ------------------------------------- | -------- | -------------------------------- | -------------- | ------------------------------- |
| `getByLabel(/email/i)`                | textbox  | accepts an email                 | value typed    | invalid rejected                |
| `getByRole('button', { name: /send    | reset    | email/i })` first                | button         | POST /api/users/forgot-password | 200 + confirmation message | 4xx + inline error |
| `getByRole('link', { name: /sign\s*in | log\s*in | back/i })` first                 | link           | navigates back to /login        | URL becomes /login         | no nav             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected |
| ----------- | ------ | -------------------------- | -------------------------------------- |
| submit form | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
