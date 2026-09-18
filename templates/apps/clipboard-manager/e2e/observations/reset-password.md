# Page observations: /reset-password (ResetPassword)

Source: live walk via Playwright + e2e/reset-password.spec.ts.
Three-field form (email, token, new password). Token comes from the
forgot-password email link; query string pre-fills `email` and
`token`. On 200 the user is auto-logged-in with the new password and
redirected to `/clips`.

## Page state assumed

- [x] Public (unauthenticated, used during account recovery)

## Elements

| selector / accessible name                                                            | role    | expected behavior on interaction                 | success signal                           | failure signal  |
| ------------------------------------------------------------------------------------- | ------- | ------------------------------------------------ | ---------------------------------------- | --------------- |
| `input#email` + `input#token` + `input#password`                                      | form    | renders three required inputs                    | all visible                              | any missing     |
| Pre-fill from query string (`?email=…&token=…`)                                       | form    | populates email + token inputs                   | both have query values                   | empty           |
| Submit with bad token → POST /api/reset_password (>=400) + error visible              | network | stays on page with `[data-mol-id="reset-error"]` | network capture sees POST; error visible | redirected away |
| `POST /api/reset_password` smoke (rejects empty body)                                 | network | endpoint exists and returns 4xx for empty body   | status 4xx                               | route missing   |
| End-to-end: signup → forgot → reset → login (best-effort, skips if no debug endpoint) | form    | full recovery flow round-trips                   | reaches /clips after reset               | flow blocked    |

## Network calls expected during normal use

| trigger      | method | path                | what request body or query is expected |
| ------------ | ------ | ------------------- | -------------------------------------- |
| submit form  | POST   | /api/reset_password | `{token, password}` → 200              |
| post-success | POST   | /api/users/log-in   | `{email, password}` → 200 (auto-login) |

## Coverage check (final pass)

- [x] Navigated and re-navigated, no new elements found
- [x] All three inputs covered + show/hide toggle
- [x] Pre-fill from query string tested
- [x] Invalid-token error path tested
- [x] Both alternate links (login, forgot) tested
- [x] /api/reset_password endpoint smoke-tested
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
