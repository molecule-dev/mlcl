# Page observations: /reset-password (ResetPassword)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/reset-password.html`.

## Page state assumed

- [x] Public (no auth required) — token is supplied via `?token=` query param

## Elements

| selector / accessible name                                   | role    | expected behavior on interaction                                                          | success signal        | failure signal                               |
| ------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------- |
| `input#password` (`getByLabel(/^new password$/i)`)           | textbox | accepts new password                                                                      | typed value reflected | minLength=8 enforced by browser              |
| `input#confirmPassword` (`getByLabel(/confirm.*password/i)`) | textbox | accepts confirmation password                                                             | typed value reflected | mismatch surfaces inline error               |
| `getByRole("button", { name: /reset password/i })`           | button  | POST `/api/users/reset-password` with token+password and on success redirects to `/login` | URL becomes `/login`  | inline 4xx error; stays on `/reset-password` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path                      | what request body or query is expected |
| --------------------- | ------ | ------------------------- | -------------------------------------- |
| submit Reset password | POST   | /api/users/reset-password | `{ token, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
