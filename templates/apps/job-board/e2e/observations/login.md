# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name               | role           | expected behavior on interaction | success signal               | failure signal                       |
| ---------------------------------------- | -------------- | -------------------------------- | ---------------------------- | ------------------------------------ |
| `getByLabel(/email/i)`                   | textbox        | accepts email                    | value typed                  | invalid email rejected               |
| `getByLabel(/password/i)`                | textbox        | accepts password (masked)        | value typed                  | too-short rejected                   |
| `getByRole('button', { name: /sign\s*in  | log\s*in/i })` | button                           | POST /api/users/log-in       | 200 + JWT stored, route → /dashboard | 4xx + inline error |
| `getByRole('link', { name: /forgot/i })` | link           | navigates to /forgot-password    | URL becomes /forgot-password | no nav                               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path              | what request body or query is expected |
| ----------- | ------ | ----------------- | -------------------------------------- |
| submit form | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
