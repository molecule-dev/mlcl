# Page observations: /login

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/login`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                       | role    | expected behavior on interaction                                                     | success signal                              | failure signal                             |
| ------------------------------------------------ | ------- | ------------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------ |
| `getByRole('heading', { name: /^Refract$/ })`    | heading | brand heading                                                                        | visible                                     | missing                                    |
| `getByLabel(/^EMAIL$/i)`                         | textbox | email input (autoFocus, type=email, required)                                        | enterable                                   | not focusable                              |
| `getByLabel(/^PASSWORD$/i)`                      | textbox | password input (type=password, required)                                             | enterable                                   | not focusable                              |
| `getByRole('button', { name: /Show password/ })` | button  | toggles password input type                                                          | input.type flips between password/text      | nothing happens                            |
| `[data-mol-id="login-submit"]` (Sign In)         | button  | POST `/api/users/createSession` with `{ email, password }`; redirect to `/dashboard` | URL becomes `/dashboard` and JWT in storage | inline `[data-mol-id="login-error"]` shown |
| invalid credentials                              | n/a     | server returns 401, error banner appears                                             | error visible, stays on `/login`            | redirects despite bad creds                |
| `getByRole('link', { name: /Forgot password/ })` | link    | navigates to `/forgot-password`                                                      | URL becomes `/forgot-password`              | stays on `/login`                          |
| `getByRole('link', { name: /Sign Up/ })`         | link    | navigates to `/signup`                                                               | URL becomes `/signup`                       | stays on `/login`                          |

## Hidden surfaces opened from this page

| trigger | what it opens                  | elements inside (selector / role / behavior) |
| ------- | ------------------------------ | -------------------------------------------- |
| (none)  | login page has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger                  | method | path                       | what request body or query is expected                    |
| ------------------------ | ------ | -------------------------- | --------------------------------------------------------- |
| Sign In submit (valid)   | POST   | `/api/users/createSession` | `{ email, password }` → 200 with `accessToken` and `user` |
| Sign In submit (invalid) | POST   | `/api/users/createSession` | 401 → UI surfaces inline error                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (email, password)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
