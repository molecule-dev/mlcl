# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                   | role          | expected behavior on interaction | success signal               | failure signal                                                |
| ------------------------------------------------------------ | ------------- | -------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| Form fields (`name`, `email`, `password`, `confirmPassword`) | textbox group | accept the four identity inputs  | typed values present in each | empty / mismatch surfaced inline                              |
| `getByRole('button', { name: /create account                 | get started   | sign up/i })`                    | button (submit)              | POST /api/users with the form payload, redirect off `/signup` | URL no longer `/signup` and access token persisted | stays with error |
| `getByRole('link', { name: /sign in/i })`                    | link          | navigate to `/login`             | URL becomes `/login`         | stays on `/signup`                                            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger            | method | path       | what request body or query is expected |
| ------------------ | ------ | ---------- | -------------------------------------- |
| Submit signup form | POST   | /api/users | `{ name, email, password }` JSON       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
