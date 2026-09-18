# Page observations: /reset-password (ResetPassword)

> Auth-recovery surface reached from the email link. Reads `?token=…`
> from the URL and posts to POST /api/users/reset-password with the
> token + new password. Bogus tokens must NOT silently 200 — that
> would let attackers reset random accounts. Spec: e2e/16-reset-password.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction          | success signal     | failure signal |
| ------------------------------------------------- | ------- | ----------------------------------------- | ------------------ | -------------- |
| `input[type="password"]` first                    | textbox | accepts new password                      | value committed    | nothing typed  |
| `getByRole('button').first()`                     | button  | submits to POST /api/users/reset-password | redirect to /login | error visible  |
| `getByRole('link', { name: /sign in\|log in/i })` | link    | back to /login                            | URL becomes /login | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path                      | expected body       |
| ------- | ------ | ------------------------- | ------------------- |
| Submit  | POST   | /api/users/reset-password | { token, password } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/16-reset-password.spec.ts`
