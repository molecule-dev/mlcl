# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Unauthenticated guest

## Elements

| selector / accessible name                  | role    | expected behavior on interaction            | success signal                   | failure signal              |
| ------------------------------------------- | ------- | ------------------------------------------- | -------------------------------- | --------------------------- |
| `input[type="email"]`                       | textbox | Captures user email                         | value persists across re-renders | input rejects keystrokes    |
| `input[type="password"]`                    | textbox | Captures account password                   | value persists, masked rendering | plaintext or reset          |
| `input[type="text"]` (name)                 | textbox | Optional display name                       | value persists                   | reset on type               |
| `getByRole('button', { name: /sign up/i })` | button  | Submits signup; navigates away from /signup | URL changes off /signup          | stays on /signup with error |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected |
| ------- | ------ | ---------- | -------------------------------------- |
| submit  | POST   | /api/users | { email, password, name }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-signup.spec.ts`
