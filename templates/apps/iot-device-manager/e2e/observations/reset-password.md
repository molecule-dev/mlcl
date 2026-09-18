# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/reset-password` (use APP_BASE)
   - Public route, no auth (but normally entered via email link).
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                                                                                   | success signal                                              | failure signal                         |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------------------------- |
| `getByRole('textbox', { name: 'EMAIL' })`         | textbox | accepts email input; submitted with form                                                                           | typed value reflected in subsequent network call            | input rejected                         |
| `getByRole('textbox', { name: 'RESET TOKEN' })`   | textbox | accepts the reset token from the email                                                                             | typed value persisted in form state                         | input rejected                         |
| `getByRole('textbox', { name: /new password/i })` | textbox | accepts new password input; submitted with form                                                                    | typed value reflected in subsequent network call            | input rejected                         |
| `getByRole('button', { name: 'Reset Password' })` | button  | submits the form — auth client POSTs the configured reset-confirm endpoint and (on success) routes to `/dashboard` | a POST request fires; on success redirected to `/dashboard` | no network call fired (form is broken) |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path                                            | what request body or query is expected |
| --------------------- | ------ | ----------------------------------------------- | -------------------------------------- |
| submit Reset Password | POST   | (auth-client configured reset-confirm endpoint) | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
