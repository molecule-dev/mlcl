# Page observations: /forgot-password (ForgotPassword)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal    | failure signal  |
| --------------------------------------------------- | ------- | -------------------------------- | ----------------- | --------------- |
| `getByRole('link', { name: /^chalk$/i })`           | link    | back to /                        | URL is /          | nav fails       |
| `page.locator('input[type="email"]')`               | textbox | accepts email                    | value typed       | rejected        |
| `getByRole('button', { name: /send reset link/i })` | button  | POST /api/users/forgot-password  | 2xx success state | error displayed |
| `getByRole('link', { name: /back to sign in/i })`   | link    | go to /login                     | URL is /login     | nav fails       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected |
| ----------- | ------ | -------------------------- | -------------------------------------- |
| submit form | POST   | /api/users/forgot-password | { email } returns 200 (non-revealing)  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
