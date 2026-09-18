# Page observations: /forgot-password (ForgotPassword)

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction        | success signal                          | failure signal       |
| --------------------------------------------------- | ------- | --------------------------------------- | --------------------------------------- | -------------------- |
| `input[type="email"]` ("Email address")             | textbox | accepts the user's email                | typed value reflected                   | empty value persists |
| `getByRole('button', { name: 'Send reset email' })` | button  | submits POST /api/users/forgot-password | "Check your inbox" success view appears | error alert visible  |
| `getByRole('link', { name: 'Sign in' })`            | link    | navigates to /login                     | URL becomes /login                      | nothing happens      |
| `getByRole('link', { name: 'Murmur' })`             | link    | navigates to landing /                  | URL becomes /                           | nothing happens      |

## Hidden surfaces opened from this page

| trigger        | what it opens             | elements inside (selector / role / behavior) |
| -------------- | ------------------------- | -------------------------------------------- |
| Submit success | inline confirmation panel | "Check your inbox" message replaces form     |

## Network calls expected during normal use

| trigger            | method | path                       | what request body or query is expected |
| ------------------ | ------ | -------------------------- | -------------------------------------- |
| Submit forgot form | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
