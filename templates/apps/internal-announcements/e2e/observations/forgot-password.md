# Page observations: /forgot-password (ForgotPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                       | role          | expected behavior on interaction | success signal            | failure signal                                                                               |
| ------------------------------------------------ | ------------- | -------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `input[type=email]`                              | textbox       | accept email                     | value reflects typed text | empty                                                                                        |
| `getByRole("button", { name: /send               | reset         | email/i })` (submit)             | button                    | POST `/api/users/forgot-password`, returns 200 regardless of email validity (no enumeration) | success message rendered | error message |
| `getByRole("link", { name: /back to sign in      | sign in/i })` | link `/login`                    | navigates to login        | URL `/login`                                                                                 | stays                    |
| `getByRole("button", { name: /Toggle theme/i })` | button        | flips theme mode                 | `data-mol-mode` flips     | unchanged                                                                                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                         | what request body or query is expected |
| ----------- | ------ | ---------------------------- | -------------------------------------- |
| Submit form | POST   | `/api/users/forgot-password` | `{ email }` JSON body                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
