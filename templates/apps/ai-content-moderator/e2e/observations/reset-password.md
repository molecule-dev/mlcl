# Page observations: /reset-password (ResetPassword)

Source: live walk via Playwright + e2e/reset-password.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role                  | expected behavior on interaction | success signal                             | failure signal                          |
| ----------------------------------- | --------------------- | -------------------------------- | ------------------------------------------ | --------------------------------------- |
| `getByLabel(/new password/i)`       | textbox               | enter new password               | value persists                             | empty blocks submit                     |
| `getByLabel(/confirm/i)`            | textbox               | confirm new password             | matches → form valid                       | mismatch → inline error, no API call    |
| `getByRole('button', { name: /reset | update/i })`          | button                           | POSTs /api/users/reset-password with token | success state, redirect or confirmation | "invalid link" if no token |
| `getByRole('link', { name: /sign in | back to sign in/i })` | link                             | navigates to /login                        | URL becomes /login                      | URL unchanged              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                                      | method | path                      | what request body or query is expected  |
| -------------------------------------------- | ------ | ------------------------- | --------------------------------------- |
| submit with valid token + matching passwords | POST   | /api/users/reset-password | { token, password } → 200               |
| submit without token                         | (none) | (none)                    | client-side error: "Invalid reset link" |
| submit with mismatched passwords             | (none) | (none)                    | client-side error, no network call      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
