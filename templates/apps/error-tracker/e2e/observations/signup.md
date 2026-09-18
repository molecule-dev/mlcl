# Page observations: /signup

> Anonymous sign-up form: 4 fields + submit. Persists JWT in localStorage on success.

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction | success signal                 | failure signal                   |
| -------------------------------------------------- | ------------------ | -------------------------------- | ------------------------------ | -------------------------------- |
| `#name` (textbox)                                  | textbox            | accepts the user's name          | value reflected                | rejected                         |
| `#email`                                           | textbox (email)    | accepts the user's email         | value reflected                | browser email validation rejects |
| `#password`                                        | textbox (password) | accepts the password             | value reflected                | rejected                         |
| `#confirmPassword`                                 | textbox (password) | accepts password confirmation    | value reflected                | rejected                         |
| `getByRole("button", { name: /create account/i })` | button             | submits POST /api/users          | URL leaves /signup, JWT stored | stays on /signup                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger            | method | path       | expected body                                      |
| ------------------ | ------ | ---------- | -------------------------------------------------- |
| Submit signup form | POST   | /api/users | { email, password, name } => { accessToken, user } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-signup.spec.ts
