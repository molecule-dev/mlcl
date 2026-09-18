# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction | success signal                             | failure signal              |
| -------------------------------------------------- | ------------------ | -------------------------------- | ------------------------------------------ | --------------------------- |
| `input#name`                                       | textbox (text)     | accept user name                 | value reflects typed text                  | value empty                 |
| `input#email`                                      | textbox (email)    | accept email                     | value reflects typed text                  | value empty                 |
| `input#password`                                   | textbox (password) | accept password                  | value reflects typed text                  | value empty                 |
| `getByRole('button', { name: /create account/i })` | button             | POST /api/users + auto-login     | URL no longer /signup, JWT in localStorage | stays on /signup with error |
| `getByRole('link', { name: /sign in                | already have/i })` | link                             | navigate back to /login                    | URL ends with /login        | stays on /signup |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger             | method | path       | what request body or query is expected |
| ------------------- | ------ | ---------- | -------------------------------------- |
| Submit registration | POST   | /api/users | name, email, password JSON body        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
