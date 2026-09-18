# Page observations: /signup (Signup)

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                        | success signal                           | failure signal                 |
| --------------------------------------------------- | ------- | ------------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| `input[autocomplete="name"]` ("Full name")          | textbox | accepts the user's display name                         | text appears in field                    | empty value persists           |
| `input[type="email"]` ("Work email")                | textbox | accepts the signup email; native HTML5 email validation | typed value reflected                    | invalid email blocks submit    |
| `input[autocomplete="new-password"]` ("Password")   | textbox | accepts the new password (minLength 8)                  | typed value reflected                    | <8 chars blocks submit         |
| `getByRole('button', { name: 'Show password' })`    | button  | toggles password input between password/text            | aria-label flips Show↔Hide; type changes | no change                      |
| `getByRole('button', { name: 'Create workspace' })` | button  | submits POST /api/users; on 201 redirects to /surveys   | URL changes off /signup                  | "Request failed" alert visible |
| `getByRole('link', { name: 'Sign in' })`            | link    | navigates to /login                                     | URL becomes /login                       | nothing happens                |
| `getByRole('link', { name: 'Murmur' })`             | link    | navigates to landing /                                  | URL becomes /                            | nothing happens                |

## Hidden surfaces opened from this page

| trigger                | what it opens                                 | elements inside (selector / role / behavior)          |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `Show password` button | toggles password visibility inline (no modal) | password input type changes from "password" to "text" |

## Network calls expected during normal use

| trigger            | method | path       | what request body or query is expected |
| ------------------ | ------ | ---------- | -------------------------------------- |
| Submit signup form | POST   | /api/users | { email, password, name }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
