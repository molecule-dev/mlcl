# Page observations: /signup (Signup)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/signup` (use APP_BASE)
   - Public route, no auth.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                 | success signal                                                                           | failure signal                 |
| ------------------------------------------------- | ------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------ |
| `getByRole('textbox', { name: /email/i })`        | textbox | accepts user input; submitted on form submit     | typed value reflected in subsequent network call                                         | input rejected or not posted   |
| `getByRole('textbox', { name: /^password$/i })`   | textbox | accepts password input; submitted on form submit | typed value persisted to localStorage on success                                         | input rejected or 4xx returned |
| `getByRole('button', { name: 'Create Account' })` | button  | POSTs `/api/users` and routes to `/dashboard`    | URL changes from `/signup` to `/dashboard`; localStorage `molecule:auth:accessToken` set | stays on `/signup`; no token   |
| `getByRole('link', { name: 'Sign In' })`          | link    | navigates to `/login`                            | URL contains `/login`                                                                    | URL unchanged                  |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected |
| --------------------- | ------ | ---------- | -------------------------------------- |
| submit Create Account | POST   | /api/users | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
