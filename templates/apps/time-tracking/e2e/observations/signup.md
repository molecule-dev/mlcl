# Page observations: /signup (Create account)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/signup.spec.ts).

> new-user signup form. POSTs to `/api/users/sign-up`, immediately logs
> the user in, redirects to `/dashboard`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/signup`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/signup.spec.ts`.

## Page state assumed

- [x] Public — `page.goto('/signup')` directly.

## Elements

| selector / accessible name        | role    | expected behavior on interaction                                                    | success signal                               | failure signal                   |
| --------------------------------- | ------- | ----------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------- |
| `[data-test="signup-form"]`       | form    | wraps name, email, password, confirm fields and submit                              | form rendered                                | missing                          |
| `[data-test="signup-first-name"]` | textbox | first name — typed value retained                                                   | typed value preserved                        | missing                          |
| `[data-test="signup-last-name"]`  | textbox | last name — typed value retained                                                    | typed value preserved                        | missing                          |
| `[data-test="signup-email"]`      | textbox | required email — typed value retained                                               | typed value preserved                        | submit blocked                   |
| `[data-test="signup-password"]`   | textbox | required password — masked input                                                    | masked input                                 | submit blocked                   |
| `[data-test="signup-confirm"]`    | textbox | required confirm password — must match                                              | submit allowed when match                    | inline error if mismatch         |
| `[data-test="signup-submit"]`     | button  | POSTs `/api/users/sign-up`, on 200 redirects to `/dashboard`, persists access token | URL ends `/dashboard`, token in localStorage | inline error, stays on `/signup` |
| `link "Sign in"` (`/login`)       | link    | navigate to login                                                                   | URL ends `/login`                            | no nav                           |
| `link "schedule Chrono"` (`/`)    | link    | back to landing                                                                     | URL is `/`                                   | no nav                           |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected         |
| -------------- | ------ | ------------------ | ---------------------------------------------- |
| submit (valid) | POST   | /api/users/sign-up | { firstName, lastName, email, password } → 200 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
