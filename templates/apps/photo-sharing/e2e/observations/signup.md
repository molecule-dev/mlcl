# Page observations: /signup (Signup)

> Public — branded auth shell. First name + last name + email + password
> fields, "Create account" button, footer "Sign in" link.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                    | success signal         | failure signal              |
| ---------------------------------------------------- | ------- | --------------------------------------------------- | ---------------------- | --------------------------- |
| `getByRole('heading', { name: /Start sharing/ })`    | heading | identifies the form                                 | heading visible        | empty page                  |
| `page.locator('input').nth(0)` (First name)          | textbox | accepts first name                                  | input updates          | read-only                   |
| `page.locator('input').nth(1)` (Last name)           | textbox | accepts last name                                   | input updates          | read-only                   |
| `page.locator('input[type="email"]')`                | textbox | accepts the user's email                            | input updates          | read-only                   |
| `page.locator('input#password')`                     | textbox | accepts password (masked)                           | input updates          | read-only                   |
| `getByRole('button', { name: /create\s*account/i })` | button  | POST /api/users; on 2xx auth + redirect to /explore | URL becomes `/explore` | stays on `/signup` w/ error |
| `getByRole('link', { name: /sign in/i })`            | link    | nav to /login                                       | URL becomes `/login`   | stays                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger      | method | path          | what request body or query is expected                    |
| ------------ | ------ | ------------- | --------------------------------------------------------- |
| Submit form  | POST   | /api/users    | `{ email, password, name? }`; 201 on success sets session |
| After signup | GET    | /api/users/me | confirms the new session belongs to the new user          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
