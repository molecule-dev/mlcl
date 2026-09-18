# Page observations: /login (Login)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs` (Playwright).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role     | expected behavior on interaction            | success signal               | failure signal           |
| ----------------------------------------------------- | -------- | ------------------------------------------- | ---------------------------- | ------------------------ |
| `getByLabel(/email/i)`                                | textbox  | accepts email input                         | typed value appears in field | input rejects characters |
| `getByLabel(/^password$/i)`                           | textbox  | accepts password input (masked)             | typed value not visible      | input rejects characters |
| `getByRole('checkbox', { name: /remember me/i })`     | checkbox | toggles "remember me"                       | aria-checked flips           | unchanged                |
| `getByRole('link', { name: /forgot password/i })`     | link     | navigates to /forgot-password               | URL becomes /forgot-password | 4xx/5xx                  |
| `getByRole('button', { name: /^sign in$/i })`         | button   | POST /api/users/log-in, redirect off /login | URL changes from /login      | toast error              |
| `getByRole('link', { name: /create your journal/i })` | link     | navigates to /signup                        | URL becomes /signup          | 4xx/5xx                  |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger         | method | path              | what request body or query is expected |
| --------------- | ------ | ----------------- | -------------------------------------- |
| Click "Sign in" | POST   | /api/users/log-in | `{ email, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
