# Page observations: /signup

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/signup`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                       | role    | expected behavior on interaction                                                         | success signal                              | failure signal                  |
| ------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| `getByRole('heading', { name: /^Refract$/ })`    | heading | brand heading                                                                            | visible                                     | missing                         |
| `getByText(/Create your review workspace/)`      | text    | sub-heading                                                                              | visible                                     | missing                         |
| `getByLabel(/NAME/i)`                            | textbox | optional display-name input                                                              | enterable                                   | not focusable                   |
| `getByLabel(/EMAIL/i)`                           | textbox | email input (type=email)                                                                 | enterable                                   | not focusable                   |
| `getByLabel(/^PASSWORD$/i)`                      | textbox | password input (type=password)                                                           | enterable                                   | not focusable                   |
| `getByRole('button', { name: /Show password/ })` | button  | toggles password input type=text                                                         | input.type flips text↔password              | nothing happens                 |
| `[data-mol-id="signup-submit"]` (Create Account) | button  | POST `/api/users` with `{ name, email, password }`; redirects to `/dashboard` on success | URL becomes `/dashboard` and JWT in storage | stays on `/signup`, error toast |
| `getByRole('link', { name: /Sign In/ })`         | link    | navigates to `/login`                                                                    | URL becomes `/login`                        | stays on `/signup`              |
| duplicate-email submit                           | n/a     | rejected by backend with 409                                                             | inline error visible, stays on `/signup`    | accepts a duplicate user        |

## Hidden surfaces opened from this page

| trigger | what it opens                   | elements inside (selector / role / behavior) |
| ------- | ------------------------------- | -------------------------------------------- |
| (none)  | signup page has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger               | method | path         | what request body or query is expected                          |
| --------------------- | ------ | ------------ | --------------------------------------------------------------- |
| Create Account submit | POST   | `/api/users` | `{ email, password, name? }` → `201` with `{ id, accessToken }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (name, email, password)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
