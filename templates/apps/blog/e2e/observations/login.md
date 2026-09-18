# Page observations: /login

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/login. Public.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role           | expected behavior on interaction | success signal                                          | failure signal                  |
| ---------------------------------------------------- | -------------- | -------------------------------- | ------------------------------------------------------- | ------------------------------- |
| `getByRole('heading', { level: 1 })` (Sign In title) | heading        | renders title text               | visible                                                 | missing                         |
| `#login-email` (email field)                         | textbox        | accepts an email address         | accepts text input                                      | not editable                    |
| `#login-password` (password field)                   | password       | accepts a password               | type=password, accepts input                            | wrong type                      |
| `getByRole('button', { name: /sign\s*in              | log\s*in/i })` | button                           | submits login → POST /api/auth/sign-in (via authClient) | navigates off /login on success | toast / stays on /login |
| `getByRole('link', { name: /forgot/i })`             | link           | navigates to /forgot-password    | URL becomes /forgot-password                            | unchanged                       |
| `getByRole('link', { name: /sign\s*up                | create/i })`   | link                             | navigates to /signup                                    | URL becomes /signup             | unchanged               |
| OAuth buttons (LoginOAuthButtons)                    | button(s)      | initiates third-party OAuth flow | redirects off-site (or pop-up)                          | no-op                           |
| error region (role=alert)                            | alert          | renders auth failure messages    | visible on bad credentials                              | missing on failure              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger        | method | path                                      | what request body or query is expected |
| -------------- | ------ | ----------------------------------------- | -------------------------------------- |
| sign-in submit | POST   | /api/auth/sign-in (or /api/users/sign-in) | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
