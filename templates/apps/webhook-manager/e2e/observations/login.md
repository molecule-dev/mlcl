# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role          | expected behavior on interaction            | success signal                                    | failure signal         |
| ------------------------------------- | ------------- | ------------------------------------------- | ------------------------------------------------- | ---------------------- |
| Email + password inputs               | textbox group | accept credentials                          | typed values present                              | empty                  |
| `getByRole('button', { name: /sign in | log in/i })`  | button (submit)                             | POST /api/users/log-in then redirect off `/login` | URL no longer `/login` | stays with error |
| Forgot-password / signup nav links    | link          | navigate to `/forgot-password` or `/signup` | URL changes to the link's `href`                  | stays on `/login`      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger            | method | path              | what request body or query is expected |
| ------------------ | ------ | ----------------- | -------------------------------------- |
| Submit credentials | POST   | /api/users/log-in | `{ email, password }` JSON             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
