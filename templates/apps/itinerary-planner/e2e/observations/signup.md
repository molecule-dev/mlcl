# Page observations: /signup

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright at http://localhost:3230/signup.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                          | success signal         | failure signal               |
| --------------------------------------------------- | ------- | --------------------------------------------------------- | ---------------------- | ---------------------------- |
| `getByRole('textbox', { name: /name/i })`           | textbox | accepts display name input                                | value reflected        | locked                       |
| `getByRole('textbox', { name: /email/i })`          | textbox | accepts email input                                       | value reflected        | locked                       |
| `getByRole('textbox', { name: /password/i })`       | textbox | accepts password (masked)                                 | value reflected        | locked                       |
| `getByRole('button', { name: /create.*account/i })` | button  | POST /api/users → token persisted, redirect to /dashboard | URL leaves /signup     | duplicate-email error or 4xx |
| `getByRole('link', { name: /sign.*in/i })`          | link    | navigates to /login                                       | URL is /login          | dead link                    |
| `getByRole('link', { name: /Waypoint/i })`          | link    | navigates to /                                            | URL is /               | dead link                    |
| `getByRole('button', { name: /toggle theme/i })`    | button  | flips dark/light via theme bond                           | `<html class>` toggles | nothing happens              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected |
| --------------------- | ------ | ---------- | -------------------------------------- |
| Create account submit | POST   | /api/users | `{ email, password, name }`            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
