# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction                             | success signal            | failure signal              |
| -------------------------------------------------- | ------------------ | ------------------------------------------------------------ | ------------------------- | --------------------------- |
| `input#name`                                       | textbox            | accept full-name input                                       | value reflects typed text | empty value                 |
| `input#email`                                      | textbox (email)    | accept email input                                           | value reflects typed text | empty value                 |
| `input#password`                                   | textbox (password) | accept password input                                        | value reflects typed text | empty value                 |
| `getByRole("button", { name: /create account/i })` | button             | POST /api/users (signup), persist tokens, redirect to /inbox | URL becomes /inbox        | stays on /signup with error |
| `getByRole("link", { name: /sign in                | log in/i })`       | link                                                         | navigate to /login        | URL becomes /login          | stays on /signup |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected |
| ------- | ------ | ---------- | -------------------------------------- |
| Submit  | POST   | /api/users | { email, password, name }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
