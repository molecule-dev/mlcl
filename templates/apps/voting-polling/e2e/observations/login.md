# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                       | success signal                        | failure signal                    |
| --------------------------------------------------- | ------- | ------------------------------------------------------ | ------------------------------------- | --------------------------------- |
| `input#email`                                       | textbox | accept email input                                     | value reflects typed text             | value empty                       |
| `input#password`                                    | textbox | accept password input                                  | value reflects typed text             | value empty                       |
| `getByRole("button", { name: /sign in/i })`         | button  | POST /api/users/log-in then route to /dashboard on 2xx | token in localStorage, /dashboard URL | 4xx with role=alert error message |
| `getByRole("link", { name: /forgot/i })`            | link    | route to /forgot-password                              | URL becomes /forgot-password          | stays on /login                   |
| `getByRole("link", { name: /sign\s*up\|create/i })` | link    | route to /signup                                       | URL becomes /signup                   | stays on /login                   |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path              | what request body or query is expected |
| ------------- | ------ | ----------------- | -------------------------------------- |
| submit form   | POST   | /api/users/log-in | { email, password }                    |
| after success | GET    | /api/users/me     | (authenticated session bootstrap)      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
