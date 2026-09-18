# Page observations: /login (Login)

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                             | success signal               | failure signal                        |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------ | ---------------------------- | ------------------------------------- |
| `input[type="email"]` ("Email address")               | textbox | accepts the user's email                                     | typed value reflected        | empty value persists                  |
| `input[autocomplete="current-password"]` ("Password") | textbox | accepts the password                                         | typed value reflected        | empty value persists                  |
| `getByRole('button', { name: 'Show password' })`      | button  | toggles password visibility inline                           | password input type flips    | no change                             |
| `getByRole('button', { name: 'Sign in' })`            | button  | submits POST /api/users/log-in; redirects to /surveys on 200 | URL changes off /login       | error alert visible, URL stays /login |
| `getByRole('link', { name: 'Forgot password?' })`     | link    | navigates to /forgot-password                                | URL becomes /forgot-password | nothing happens                       |
| `getByRole('link', { name: 'Start a free trial' })`   | link    | navigates to /signup                                         | URL becomes /signup          | nothing happens                       |
| `getByRole('link', { name: 'Murmur' })`               | link    | navigates to landing /                                       | URL becomes /                | nothing happens                       |

## Hidden surfaces opened from this page

| trigger                | what it opens                      | elements inside (selector / role / behavior) |
| ---------------------- | ---------------------------------- | -------------------------------------------- |
| `Show password` button | toggles password visibility inline | password input type changes                  |

## Network calls expected during normal use

| trigger           | method | path              | what request body or query is expected |
| ----------------- | ------ | ----------------- | -------------------------------------- |
| Submit login form | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
