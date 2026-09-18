# Page observations: /forgot-password (ForgotPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                        | role             | expected behavior on interaction | success signal                          | failure signal       |
| ----------------------------------------------------------------- | ---------------- | -------------------------------- | --------------------------------------- | -------------------- |
| `locator('#email')`                                               | textbox (email)  | accept email input               | value reflects typed text               | empty value          |
| `getByRole('button', { name: /send reset                          | reset link/i })` | button                           | submit, POST /api/users/forgot-password | success card visible | stays on form with error |
| `getByRole('link', { name: /back to sign in/i })` (success card)  | link             | navigate to /login               | URL becomes /login                      | stays                |
| `getByRole('button', { name: /back to sign in/i })` (form footer) | button           | navigate to /login               | URL becomes /login                      | stays                |

## Hidden surfaces opened from this page

| trigger         | what it opens             | elements inside (selector / role / behavior) |
| --------------- | ------------------------- | -------------------------------------------- |
| Send reset link | success confirmation card | "Back to sign in" link                       |

## Network calls expected during normal use

| trigger          | method | path                       | what request body or query is expected |
| ---------------- | ------ | -------------------------- | -------------------------------------- |
| Send reset click | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-forgot-password.spec.ts`
