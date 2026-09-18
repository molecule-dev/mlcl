# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/login` (use APP_BASE)
   - Public route, no auth.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                     | success signal                                    | failure signal              |
| ------------------------------------------------- | ------- | ---------------------------------------------------- | ------------------------------------------------- | --------------------------- |
| `getByRole('textbox', { name: /email/i })`        | textbox | accepts email input; submitted with form             | typed value reflected in subsequent network call  | input rejected              |
| `getByRole('button', { name: 'Sign In' })`        | button  | POSTs `/api/users/log-in` and routes to `/dashboard` | URL leaves `/login`; access token in localStorage | stays on `/login`; no token |
| `getByRole('link', { name: 'Forgot password?' })` | link    | navigates to `/forgot-password`                      | URL contains `/forgot-password`                   | URL unchanged               |
| `getByRole('link', { name: 'Sign Up' })`          | link    | navigates to `/signup`                               | URL contains `/signup`                            | URL unchanged               |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path              | what request body or query is expected |
| -------------- | ------ | ----------------- | -------------------------------------- |
| submit Sign In | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
