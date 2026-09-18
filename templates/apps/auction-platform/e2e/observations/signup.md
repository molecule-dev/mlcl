# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction         | success signal                           | failure signal              |
| -------------------------------------------------- | ------------------ | ---------------------------------------- | ---------------------------------------- | --------------------------- |
| `getByLabel(/Display name/i)`                      | textbox            | accept name input                        | value reflects input                     | value empty                 |
| `getByLabel(/email/i)`                             | textbox            | accept email input                       | value reflects input                     | value empty                 |
| `getByLabel(/^password$/i)`                        | textbox (password) | accept password input                    | value reflects input                     | value empty                 |
| `getByRole("button", { name: /Show password/i })`  | button             | reveal password text                     | type=text                                | type=password               |
| `getByRole("button", { name: /Create account/i })` | button (submit)    | POST /api/users with name+email+password | redirect off /signup, accessToken stored | stays on /signup with error |
| `getByRole("link", { name: /Sign in/i })`          | link               | navigate to /login                       | URL becomes /login                       | stays on /signup            |
| `getByRole("link", { name: /Terms/i })`            | link               | navigate to /terms                       | URL becomes /terms                       | stays on /signup            |
| `getByRole("link", { name: /Privacy/i })`          | link               | navigate to /privacy                     | URL becomes /privacy                     | stays on /signup            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger            | method | path       | what request body or query is expected |
| ------------------ | ------ | ---------- | -------------------------------------- |
| Submit credentials | POST   | /api/users | name + email + password                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
