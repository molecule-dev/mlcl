# Page observations: forgot-password

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role        | expected behavior on interaction | success signal                  | failure signal          |
| ----------------------------------- | ----------- | -------------------------------- | ------------------------------- | ----------------------- |
| `getByLabel(/email/i)`              | textbox     | accept email                     | value reflects email            | empty                   |
| `getByRole("button", { name: /send  | reset/i })` | button                           | POST /api/users/forgot-password | success message visible | no message |
| `getByRole("link", { name: /sign in | back/i })`  | link                             | go back to /login               | URL = /login            | stays      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| Submit  | POST   | /api/users/forgot-password | email                                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
