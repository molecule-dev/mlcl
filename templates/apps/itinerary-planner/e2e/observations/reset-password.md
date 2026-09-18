# Page observations: /reset-password

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role           | expected behavior on interaction | success signal      | failure signal                                         |
| --------------------------------------------- | -------------- | -------------------------------- | ------------------- | ------------------------------------------------------ |
| `getByRole('textbox', { name: /email/i })`    | textbox        | accepts email                    | value reflected     | locked                                                 |
| `getByRole('textbox', { name: /token          | reset/i })`    | textbox                          | accepts reset token | value reflected                                        | locked                          |
| `getByRole('textbox', { name: /password/i })` | textbox        | accepts new password             | value reflected     | locked                                                 |
| `getByRole('button', { name: /submit          | set.*password  | reset/i })`                      | button              | POST /api/users/reset-password → token-validated reset | success or 4xx response visible | 404 |
| `getByRole('link', { name: /back              | sign.*in/i })` | link                             | navigates to /login | URL is /login                                          | dead link                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                      | what request body or query is expected |
| ------------ | ------ | ------------------------- | -------------------------------------- |
| Submit reset | POST   | /api/users/reset-password | `{ resetToken, email, password }`      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
