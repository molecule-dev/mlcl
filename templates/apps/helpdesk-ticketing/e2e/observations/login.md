# Page observations: /login (Login)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role           | expected behavior on interaction | success signal                        | failure signal               |
| ----------------------------------------- | -------------- | -------------------------------- | ------------------------------------- | ---------------------------- |
| `#email, input[type="email"]` first       | textbox        | accepts email                    | typed value reflected                 | invalid rejected             |
| `#password, input[type="password"]` first | textbox        | accepts password                 | typed value reflected                 | wrong rejected               |
| `getByRole("button", { name: /sign\s*in   | log\s*in/i })` | button                           | POST /api/users/log-in and route to / | URL leaves /login on success | "Invalid credentials" inline |
| `getByRole("link", { name: /forgot/i })`  | link           | navigates to /forgot-password    | URL becomes /forgot-password          | stays on /login              |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path              | what request body or query is expected |
| -------------- | ------ | ----------------- | -------------------------------------- |
| submit Sign in | POST   | /api/users/log-in | `{ email, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
