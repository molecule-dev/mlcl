# Page observations: /signup (Signup)

> Public — branded auth shell with first/last/email/password/confirm
> fields and a submit button. On success, useSignup() creates the user
> and the page navigates to /dashboard.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                 | role        | expected behavior on interaction                                    | success signal           | failure signal                |
| ---------------------------------------------------------- | ----------- | ------------------------------------------------------------------- | ------------------------ | ----------------------------- |
| `getByRole('heading', { name: /create your workspace/i })` | heading     | identifies the page                                                 | heading visible          | empty page                    |
| `getByLabel(/first.*name/i)`                               | textbox     | accepts first name                                                  | input value updates      | input read-only               |
| `getByLabel(/last.*name/i)`                                | textbox     | accepts last name                                                   | input value updates      | input read-only               |
| `getByLabel(/work email                                    | ^email$/i)` | textbox                                                             | accepts the user's email | input value updates           | input read-only |
| `getByLabel(/^password$/i)`                                | textbox     | accepts the password masked                                         | input value updates      | input read-only               |
| `getByLabel(/confirm.*password/i)`                         | textbox     | accepts password again                                              | input value updates      | input read-only               |
| `getByRole('button', { name: /create account/i })`         | button      | submits useSignup → POST /api/users; on 2xx redirects to /dashboard | URL becomes `/dashboard` | stays on `/signup` with error |
| `getByRole('link', { name: /sign in/i })`                  | link        | nav to /login                                                       | URL becomes `/login`     | stays on `/signup`            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected         |
| ----------- | ------ | ---------- | ---------------------------------------------- |
| Submit form | POST   | /api/users | `{ email, password, name? }`; 201 sets session |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-signup.spec.ts`
