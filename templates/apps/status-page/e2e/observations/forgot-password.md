# Page observations: /forgot-password (Forgot password)

> Filled from a live walk via Playwright MCP at /forgot-password. Re-walk
> if any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name             | role            | expected behavior on interaction   | success signal        | failure signal                  |
| -------------------------------------- | --------------- | ---------------------------------- | --------------------- | ------------------------------- |
| `getByLabel(/email/i)` (Email)         | textbox (email) | accept email of account to recover | typed value reflected | input rejected                  |
| `getByRole('button', { name: /send     | reset           | recover/i })` (Send reset link)    | button                | POST /api/users/forgot-password | success message; status 2xx | error message |
| `getByRole('link', { name: /sign\\s*in | log\\s*in       | back/i })` (back to /login)        | link                  | navigate to /login              | URL becomes /login          | nav fails     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected                         |
| ------- | ------ | -------------------------- | -------------------------------------------------------------- |
| Submit  | POST   | /api/users/forgot-password | `{ email }` returns 200 (always 200 to avoid leaking accounts) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-forgot-password.spec.ts`
