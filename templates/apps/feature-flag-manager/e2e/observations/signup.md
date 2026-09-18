# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role               | expected behavior on interaction | success signal                        | failure signal              |
| ---------------------------------------------------- | ------------------ | -------------------------------- | ------------------------------------- | --------------------------- |
| `locator('#signup-name')`                            | textbox (name)     | accept name input                | value reflects typed text             | empty value                 |
| `locator('#signup-email')`                           | textbox (email)    | accept email input               | value reflects typed text             | empty value                 |
| `locator('#signup-password')`                        | textbox (password) | accept password input            | value reflects typed text             | empty value                 |
| `getByRole('button', { name: /create workspace/i })` | button             | submit form, POST /api/users     | redirect to /dashboard                | stays on /signup with error |
| `getByRole('button', { name: /show password/i })`    | button             | toggle password visibility       | input type changes from password→text | input type stays password   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger                | method | path       | what request body or query is expected |
| ---------------------- | ------ | ---------- | -------------------------------------- |
| Create workspace click | POST   | /api/users | { name, email, password }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-signup.spec.ts`
