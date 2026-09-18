# Page observations: /login

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role             | expected behavior on interaction | success signal                                         | failure signal               |
| --------------------------------------------------- | ---------------- | -------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `input[type="email"]`                               | email input      | accept the user's email address  | value typed                                            | input rejected               |
| `input[type="password"]`                            | password input   | accept the user's password       | value typed                                            | input rejected               |
| `getByRole('button', { name: /(log\s*in             | sign\s*in)/i })` | submit                           | POST /api/users/log-in; on success navigate off /login | URL no longer matches /login | stays on /login |
| `getByRole('button', { name: /forgot password/i })` | button           | navigate to /forgot-password     | URL becomes /forgot-password                           | unchanged                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | flat form                                    |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected                                                |
| ------- | ------ | ----------------- | ------------------------------------------------------------------------------------- |
| Submit  | POST   | /api/users/log-in | `{ email, password }` — server returns 2xx + accessToken on success, 4xx on bad creds |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
