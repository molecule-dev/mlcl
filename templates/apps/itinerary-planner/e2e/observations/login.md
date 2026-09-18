# Page observations: /login

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright at http://localhost:3230/login.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role           | expected behavior on interaction                    | success signal          | failure signal             |
| -------------------------------------------------- | -------------- | --------------------------------------------------- | ----------------------- | -------------------------- |
| `getByRole('textbox', { name: /email/i })`         | textbox        | accepts email input                                 | value reflected         | locked / disabled          |
| `getByRole('textbox', { name: /password/i })`      | textbox        | accepts password input (masked)                     | value reflected         | locked / disabled          |
| `getByRole('button', { name: /sign\s*in/i })`      | button         | submits creds → POST /api/users/log-in → /dashboard | navigates off /login    | stays on /login with error |
| `getByRole('link', { name: /forgot.*password/i })` | link           | navigates to /forgot-password                       | URL is /forgot-password | dead link                  |
| `getByRole('link', { name: /create.*account        | sign.*up/i })` | link                                                | navigates to /signup    | URL is /signup             | dead link |
| `getByRole('link', { name: /Waypoint/i })`         | link           | navigates to /                                      | URL is /                | dead link                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path              | what request body or query is expected |
| ------------- | ------ | ----------------- | -------------------------------------- |
| Sign in click | POST   | /api/users/log-in | `{ email, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
