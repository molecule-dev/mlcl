# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role                    | expected behavior on interaction                           | success signal            | failure signal               |
| ------------------------------------------------------ | ----------------------- | ---------------------------------------------------------- | ------------------------- | ---------------------------- |
| `input[type=email]`                                    | textbox                 | accept email                                               | value reflects typed text | empty                        |
| `input[type=password]`                                 | textbox                 | accept password                                            | value reflects typed text | empty                        |
| `getByRole("button", { name: /sign\s*in/i })` (submit) | button                  | POST `/api/users/log-in`, navigate off `/login` on success | URL no longer `/login`    | stays on `/login` with error |
| `getByRole("link", { name: /forgot.*password/i })`     | link `/forgot-password` | navigates to forgot-password                               | URL `/forgot-password`    | stays                        |
| `getByRole("link", { name: /sign\s*up                  | create/i })`            | link `/signup`                                             | navigates to signup       | URL `/signup`                | stays |
| `getByRole("button", { name: /Toggle theme/i })`       | button                  | flips theme mode                                           | `data-mol-mode` flips     | unchanged                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger            | method | path                | what request body or query is expected |
| ------------------ | ------ | ------------------- | -------------------------------------- |
| Submit credentials | POST   | `/api/users/log-in` | `{ email, password }` JSON body        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
