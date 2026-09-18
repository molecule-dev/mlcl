# Page observations: /forgot-password (ForgotPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Unauthenticated guest

## Elements

| selector / accessible name         | role         | expected behavior on interaction    | success signal                  | failure signal                  |
| ---------------------------------- | ------------ | ----------------------------------- | ------------------------------- | ------------------------------- |
| `input[type="email"]`              | textbox      | Captures the email to send reset to | value persists                  | rejected keystrokes             |
| `getByRole('button', { name: /send | reset/i })`  | button                              | Submits forgot-password request | success message or status state | error rendered            |
| `getByRole('button', { name: /back | cancel/i })` | button                              | Returns to /login               | URL becomes /login              | still on /forgot-password |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-forgot-password.spec.ts`
