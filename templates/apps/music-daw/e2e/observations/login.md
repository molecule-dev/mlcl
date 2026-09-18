# Page observations: /login (Login)

> Filled from a Playwright MCP walk of the live app at
> `http://localhost:3030/login`. Public, no auth required.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role            | expected behavior on interaction                      | success signal                                                         | failure signal                            |
| ------------------------------------------------------- | --------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| `getByRole('heading', { name: /^Fugue$/ })`             | heading         | brand header                                          | visible                                                                | missing                                   |
| `#email` (`type="email" required autocomplete="email"`) | textbox         | email field                                           | type=email + required                                                  | missing or wrong attrs                    |
| `#password` (`type="password"` toggleable)              | textbox         | password field                                        | accepts text, shows password masked                                    | missing                                   |
| `getByRole('button', { name: /show password/i })`       | button          | toggles `type=password` → `type=text` for `#password` | input type flips                                                       | unchanged                                 |
| `getByRole('link', { name: /forgot password/i })`       | link            | routes to `/forgot-password`                          | URL becomes `/forgot-password`                                         | stays on `/login`                         |
| `getByRole('button', { name: /open the studio           | sign\s*in/i })` | button                                                | submits POST `/api/users/log-in`; on success navigates to `/dashboard` | URL = `/dashboard`, token in localStorage | stays on `/login`, alert visible |
| `getByRole('alert')` (after wrong creds)                | alert           | error from `useLogin` hook bubbled into UI            | red error box with "incorrect"/"invalid" copy                          | no error visible                          |
| `getByRole('link', { name: /sign up/i })`               | link            | footer link to `/signup`                              | href = `/signup`                                                       | missing                                   |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside (selector / role / behavior) |
| ------- | -------------------------------- | -------------------------------------------- |
| (none)  | login screen has no menus/modals | n/a                                          |

## Network calls expected during normal use

| trigger | method | path                | what request body or query is expected                                                         |
| ------- | ------ | ------------------- | ---------------------------------------------------------------------------------------------- |
| submit  | POST   | `/api/users/log-in` | `{ email, password }`; returns `201` with `{ accessToken, user }` on success, 4xx on bad creds |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
