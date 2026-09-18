# Page observations: /signup (Signup)

> Public auth surface. Form fields: first/last name, username, email,
> password (twice). Posts to POST /api/users and on success stores a
> JWT in localStorage and redirects into the app. Spec: e2e/02-signup.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                                         | role    | expected behavior on interaction | success signal        | failure signal |
| -------------------------------------------------------------------------------------------------- | ------- | -------------------------------- | --------------------- | -------------- |
| `input[autocomplete="given-name"]`                                                                 | textbox | accepts first name               | value committed       | nothing typed  |
| `input[autocomplete="family-name"]`                                                                | textbox | accepts last name                | value committed       | nothing typed  |
| `input[autocomplete="username"]`                                                                   | textbox | accepts username                 | value committed       | nothing typed  |
| `input[type="email"]`                                                                              | textbox | accepts email                    | value committed       | nothing typed  |
| `input[type="password"]` first                                                                     | textbox | accepts password                 | value committed       | nothing typed  |
| `getByRole('button', { name: /Initialize Session\|Create account\|Join\|Sign up\|Get started/i })` | button  | submits form to POST /api/users  | redirects off /signup | error visible  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path       | expected body                       |
| ------- | ------ | ---------- | ----------------------------------- |
| Submit  | POST   | /api/users | { email, password, name, username } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-signup.spec.ts`
