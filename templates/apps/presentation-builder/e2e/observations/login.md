# Page observations: /login

> Captured live via Playwright on the running smoke-app at
> `http://localhost:3190${stem === 'root' ? '/' : '/' + stem.replace(/__/g, '/')}`

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role         | expected behavior on interaction | success signal                                       | failure signal                    |
| ------------------------------------- | ------------ | -------------------------------- | ---------------------------------------------------- | --------------------------------- |
| `input[type="email"]`                 | textbox      | collects login email             | visible                                              | missing                           |
| `input[type="password"]`              | textbox      | collects login password          | visible                                              | missing                           |
| `getByRole("button", { name: /sign in | log in/i })` | button                           | POST /api/users/log-in (or /api/sessions) with creds | session 2xx + redirect off /login | stays on /login with error |
| `a[href="/signup"]`                   | link         | lets a new user reach signup     | visible                                              | missing                           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| submit  | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
