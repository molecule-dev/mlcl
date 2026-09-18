# Page observations: /signup (signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction         | success signal         | failure signal              |
| -------------------------------------------------- | ------------------ | ---------------------------------------- | ---------------------- | --------------------------- |
| `getByPlaceholder("Aria")` (first name)            | textbox            | accept first name                        | value reflects input   | value empty                 |
| `getByPlaceholder("Lin")` (last name)              | textbox            | accept last name                         | value reflects input   | value empty                 |
| `getByLabel(/Email address/i)`                     | textbox            | accept email                             | value reflects input   | value empty                 |
| `getByLabel(/^Password$/i)`                        | textbox (password) | accept password                          | value reflects input   | value empty                 |
| `getByLabel(/Confirm password/i)`                  | textbox (password) | accept confirmation password             | value reflects input   | value empty                 |
| `getByRole("button", { name: /Create account/i })` | button (submit)    | POST signup, then redirect to /dashboard | URL becomes /dashboard | stays on /signup with error |
| `getByRole("link", { name: /Sign in/i })`          | link               | navigate to /login                       | URL becomes /login     | stays on /signup            |
| `getByRole("link", { name: /Back to home/i })`     | link               | navigate to /                            | URL becomes /          | stays on /signup            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path       | what request body or query is expected |
| ------------- | ------ | ---------- | -------------------------------------- |
| Submit signup | POST   | /api/users | firstName, lastName, email, password   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
