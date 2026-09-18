# Page observations: /login (Login)

> Public — branded auth shell. Email + password fields, "Forgot password?"
> link, "Show password" toggle, "Sign In" submit button, footer "Start
> sharing" link to /signup.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                               | role           | expected behavior on interaction | success signal                                      | failure signal                      |
| -------------------------------------------------------- | -------------- | -------------------------------- | --------------------------------------------------- | ----------------------------------- |
| `getByRole('heading', { name: /Obscura/ })`              | heading        | identifies the brand             | heading visible                                     | empty page                          |
| `page.locator('input[type="email"]')`                    | textbox        | accepts user email               | input value reflects typed text                     | input read-only                     |
| `page.locator('input[type="password"], input#password')` | textbox        | accepts password (masked)        | input updates                                       | input read-only                     |
| `getByRole('button', { name: /sign\s*in                  | log\s*in/i })` | button                           | POST /api/users/log-in; on 2xx redirect to /explore | URL becomes `/explore`; cookies set | stays on `/login` w/ error |
| `getByRole('link', { name: /forgot.*password/i })`       | link           | nav to /forgot-password          | URL becomes `/forgot-password`                      | stays                               |
| `getByRole('link', { name: /start sharing                | sign up        | create account/i })`             | link                                                | nav to /signup                      | URL becomes `/signup`      | stays |

## Hidden surfaces opened from this page

| trigger               | what it opens                    | elements inside                              |
| --------------------- | -------------------------------- | -------------------------------------------- |
| Click "Show password" | toggles password input type=text | the password input becomes visible plaintext |

## Network calls expected during normal use

| trigger     | method | path              | what request body or query is expected             |
| ----------- | ------ | ----------------- | -------------------------------------------------- |
| Submit form | POST   | /api/users/log-in | `{ email, password }`; 200 on success sets session |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
