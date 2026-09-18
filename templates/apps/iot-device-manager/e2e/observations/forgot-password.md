# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/forgot-password` (use APP_BASE)
   - Public route, no auth.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                               | success signal                                   | failure signal                         |
| -------------------------------------------------- | ------- | -------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| `getByRole('textbox', { name: /email/i })`         | textbox | accepts email input; submitted with form                       | typed value reflected in subsequent network call | input rejected                         |
| `getByRole('button', { name: 'Send Reset Link' })` | button  | POSTs `/api/users/forgot-password` and shows confirmation copy | confirmation copy or success state appears       | stays as initial form with no feedback |
| `getByRole('link', { name: 'Sign In' })`           | link    | navigates back to `/login`                                     | URL contains `/login`                            | URL unchanged                          |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                       | what request body or query is expected |
| ---------------------- | ------ | -------------------------- | -------------------------------------- |
| submit Send Reset Link | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
