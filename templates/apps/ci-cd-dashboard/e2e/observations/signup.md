# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction                             | success signal                | failure signal                |
| -------------------------------------------------- | ------------------ | ------------------------------------------------------------ | ----------------------------- | ----------------------------- |
| `getByLabel(/^Name$/i)`                            | textbox            | accept name input                                            | value reflects typed name     | value empty                   |
| `getByLabel(/^Email$/i)`                           | textbox            | accept email input                                           | value reflects typed email    | value empty                   |
| `getByLabel(/^Password$/i)`                        | textbox (password) | accept password input                                        | value reflects typed password | value empty                   |
| `getByLabel(/Confirm password/i)`                  | textbox (password) | accept confirm password input                                | value reflects typed value    | value empty                   |
| `getByRole('button', { name: /Create account/i })` | button (submit)    | validates pwd match, POST /api/users, redirect to /pipelines | URL becomes /pipelines        | stays on /signup (with error) |
| `getByRole('link', { name: /^Sign in$/i })`        | link               | navigate to /login                                           | URL becomes /login            | stays on /signup              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected |
| ----------- | ------ | ---------- | -------------------------------------- |
| Submit form | POST   | /api/users | name + email + password                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
