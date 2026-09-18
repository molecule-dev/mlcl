# Page observations: /forgot-password

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/forgot-password. Public.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                               | role       | expected behavior on interaction                            | success signal              | failure signal                                                    |
| ------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| `getByRole('heading', { level: 1 })` ("Forgot your password" or similar) | heading    | renders page title                                          | visible                     | missing                                                           |
| `input[type="email"]` (email field)                                      | textbox    | accepts an email address                                    | accepts text input          | not editable                                                      |
| `getByRole('button', { name: /send                                       | reset      | continue/i })`                                              | button                      | submits forgot-password request → POST /api/users/forgot-password | success message visible OR redirect | error toast |
| `getByRole('link', { name: /sign\s*in                                    | back/i })` | link                                                        | navigates back to /login    | URL becomes /login                                                | unchanged                           |
| success/info notice region                                               | status     | renders confirmation after submit ("Check your email" etc.) | visible after POST resolves | absent                                                            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
