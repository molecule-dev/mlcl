# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs` (Playwright).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal               | failure signal |
| --------------------------------------------------- | ------- | -------------------------------- | ---------------------------- | -------------- |
| `getByLabel(/email/i)`                              | textbox | accepts email input              | typed value appears          | rejected       |
| `getByRole('button', { name: /send reset link/i })` | button  | POST /api/users/forgot-password  | confirmation message visible | toast error    |
| `getByRole('link', { name: /back to sign in/i })`   | link    | navigates to /login              | URL /login                   | 4xx/5xx        |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path                       | what request body or query is expected |
| -------------------- | ------ | -------------------------- | -------------------------------------- |
| Submit reset request | POST   | /api/users/forgot-password | `{ email }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
