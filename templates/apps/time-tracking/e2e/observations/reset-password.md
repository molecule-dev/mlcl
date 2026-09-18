# Page observations: /reset-password (Set new password)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/reset-password.spec.ts).

> public reset-password form. Token supplied by the magic link query
> string; submitting POSTs `/api/users/reset-password` with token + new
> password. Without a valid token the submit fails and the user is
> kept on `/reset-password`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/reset-password`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/reset-password.spec.ts`.

## Page state assumed

- [x] Public — `page.goto('/reset-password')` directly (token usually in query string).

## Elements

| selector / accessible name          | role    | expected behavior on interaction                                                                                                     | success signal                            | failure signal                           |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------- |
| `heading "Set a new password"`      | heading | renders form heading                                                                                                                 | h2 visible                                | missing                                  |
| `textbox "New password lock"`       | textbox | new password — masked input                                                                                                          | masked input                              | missing                                  |
| `textbox "Confirm password lock"`   | textbox | confirm password — must match new                                                                                                    | submit allowed when match                 | inline error / submit blocked            |
| `button "Reset password"`           | button  | POSTs `/api/users/reset-password`; success → redirect to `/login` or `/dashboard`; missing token stays on /reset-password with error | URL changes to login/dashboard on success | inline error, stays on `/reset-password` |
| `link "Back to sign in"` (`/login`) | link    | navigate back to login                                                                                                               | URL ends `/login`                         | no nav                                   |
| `link "schedule Chrono"` (`/`)      | link    | back to landing                                                                                                                      | URL is `/`                                | no nav                                   |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected                      |
| ------- | ------ | ------------------------- | ----------------------------------------------------------- |
| submit  | POST   | /api/users/reset-password | { token, password } → 200 (or 4xx if token missing/invalid) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
