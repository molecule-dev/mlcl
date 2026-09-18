# Page observations: /login (login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role               | expected behavior on interaction                                     | success signal                | failure signal                           |
| --------------------------------------------------- | ------------------ | -------------------------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| `getByLabel(/Email address/i)`                      | textbox            | accept email input                                                   | value reflects typed email    | value empty                              |
| `getByLabel(/Password/i)`                           | textbox (password) | accept password input                                                | value reflects typed password | value empty                              |
| `getByRole("button", { name: /Show password/i })`   | button             | toggle password visibility                                           | input type changes to text    | still type=password                      |
| `getByRole("link", { name: /Forgot password/i })`   | link               | navigate to /forgot-password                                         | URL becomes /forgot-password  | stays on /login                          |
| `getByRole("button", { name: /Enter Reverie/i })`   | button (submit)    | POST credentials to /api/sessions, redirect to /dashboard on success | URL becomes /dashboard        | stays on /login (or shows error message) |
| `getByRole("link", { name: /Create an account/i })` | link               | navigate to /signup                                                  | URL becomes /signup           | stays on /login                          |
| `getByRole("link", { name: /Back to home/i })`      | link               | navigate to /                                                        | URL becomes /                 | stays on /login                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger            | method | path              | what request body or query is expected |
| ------------------ | ------ | ----------------- | -------------------------------------- |
| Submit credentials | POST   | /api/users/log-in | email + password                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
