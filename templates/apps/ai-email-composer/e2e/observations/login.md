# Page observations: /login (Login)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/login.html`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                                          | success signal                                         | failure signal                      |
| ------------------------------------------------------- | ------- | ------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------- |
| `getByLabel(/email/i)` first input                      | textbox | accepts email                                                             | typed value reflected                                  | input ignored                       |
| `getByLabel(/password/i)` first input                   | textbox | accepts password                                                          | typed value reflected                                  | input ignored                       |
| `getByRole("button", { name: /sign\s*in\|log\s*in/i })` | button  | submits credentials, on success leaves `/login` and lands on `/dashboard` | URL no longer matches `/login`; `/dashboard` reachable | stays on `/login` with inline error |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path              | what request body or query is expected |
| -------------- | ------ | ----------------- | -------------------------------------- |
| submit Sign in | POST   | /api/users/log-in | `{ email, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
