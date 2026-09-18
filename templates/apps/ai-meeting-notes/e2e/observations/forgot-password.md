# Page observations: /forgot-password (Forgot password)

> Public — single-field form that posts to the user-resource forgot
> password handler. On 2xx, the form replaces itself with a "check your
> inbox" success state.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                               | role            | expected behavior on interaction | success signal      | failure signal                                                                        |
| -------------------------------------------------------- | --------------- | -------------------------------- | ------------------- | ------------------------------------------------------------------------------------- |
| `getByRole('heading', { name: /reset your password/i })` | heading         | identifies the page              | heading visible     | empty page                                                                            |
| `getByLabel(/email/i)`                                   | textbox         | accepts the user's email         | input value updates | read-only                                                                             |
| `getByRole('button', { name: /send.*reset                | reset link      | send/i })`                       | button              | POST /api/users/forgot-password with `{ email }`; on 2xx swaps form for success state | "check your inbox"-style text appears | error alert |
| `getByRole('link', { name: /back to sign in              | ^sign in$/i })` | link                             | nav to /login       | URL becomes `/login`                                                                  | stays on `/forgot-password`           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected   |
| ----------- | ------ | -------------------------- | ---------------------------------------- |
| Submit form | POST   | /api/users/forgot-password | `{ email }`; 200 even for unknown emails |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-forgot-password.spec.ts`
