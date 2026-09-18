# Page observations: /login (Sign in)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/login.spec.ts).

> existing-user authentication form. POSTs to `/api/users/log-in`,
> stores access token + user in localStorage, redirects to `/dashboard`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/login`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/login.spec.ts`.

## Page state assumed

- [x] Public — `page.goto('/login')` directly.

## Elements

| selector / accessible name                     | role    | expected behavior on interaction                                                                             | success signal                                       | failure signal                  |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------- |
| `[data-test="login-form"]`                     | form    | wraps the email + password fields and the submit button                                                      | form rendered                                        | missing                         |
| `[data-test="login-email"]` (email)            | textbox | required email — value retained while typing                                                                 | typed value preserved                                | submit blocked / accepts empty  |
| `[data-test="login-password"]` (password)      | textbox | required password — masked input                                                                             | masked input                                         | submit blocked / accepts empty  |
| `link "Forgot password?"` (`/forgot-password`) | link    | navigates to forgot-password form                                                                            | URL ends `/forgot-password`                          | no nav                          |
| `[data-test="login-submit"]`                   | button  | POSTs `/api/users/log-in`, on 200 navigates to `/dashboard` and persists access-token + user in localStorage | URL ends `/dashboard`, localStorage has access token | inline error, stays on `/login` |
| `link "Sign up"` (`/signup`)                   | link    | navigate to signup                                                                                           | URL ends `/signup`                                   | no nav                          |
| `link "schedule Chrono"` (logo, `/`)           | link    | navigate back to landing                                                                                     | URL is `/`                                           | no nav                          |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger          | method | path              | what request body or query is expected             |
| ---------------- | ------ | ----------------- | -------------------------------------------------- |
| submit (valid)   | POST   | /api/users/log-in | { email, password } → 200 with access token + user |
| submit (invalid) | POST   | /api/users/log-in | { email, wrong-password } → 4xx                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
