# Page observations: /reset-password (reset-password)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role               | expected behavior on interaction                  | success signal                        | failure signal           |
| ----------------------------------------------------- | ------------------ | ------------------------------------------------- | ------------------------------------- | ------------------------ |
| `getByLabel(/New password/i)`                         | textbox (password) | accept new password                               | value reflects input                  | value empty              |
| `getByLabel(/Confirm password/i)`                     | textbox (password) | accept confirmation                               | value reflects input                  | value empty              |
| `getByRole("button", { name: /Save new password/i })` | button (submit)    | PUT /api/users/password with token + new password | success message OR redirect to /login | error message inline     |
| `getByRole("link", { name: /Back to sign in/i })`     | link               | navigate to /login                                | URL becomes /login                    | stays on /reset-password |
| `getByRole("link", { name: /Back to home/i })`        | link               | navigate to /                                     | URL becomes /                         | stays on /reset-password |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path                | what request body or query is expected |
| ------------ | ------ | ------------------- | -------------------------------------- |
| Submit reset | PUT    | /api/users/password | token + new password                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
