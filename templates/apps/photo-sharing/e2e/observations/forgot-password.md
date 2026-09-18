# Page observations: /forgot-password (ForgotPassword)

> Public — branded auth shell. Single email field + "Send reset link" button.
> "Back to sign in" link routes to /login. After submit shows a confirmation
> banner. Real Mailgun call fires on the backend.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction | success signal       | failure signal                                  |
| ------------------------------------------------- | ------- | -------------------------------- | -------------------- | ----------------------------------------------- |
| `getByRole('heading', { name: /Obscura/ })`       | heading | identifies the brand             | heading visible      | empty page                                      |
| `page.locator('input[type="email"]')`             | textbox | accepts user email               | input updates        | read-only                                       |
| `getByRole('button', { name: /send.*link          | reset   | submit/i })`                     | button               | POST /api/users/forgot-password — Mailgun fires | confirmation banner shown | stays + error |
| `getByRole('link', { name: /back to sign in/i })` | link    | nav to /login                    | URL becomes `/login` | stays                                           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected              |
| ----------- | ------ | -------------------------- | --------------------------------------------------- |
| Submit form | POST   | /api/users/forgot-password | `{ email }`; always 200 (no account-existence leak) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
