# Page observations: /login (Login)

> Filled by AI agent driving the running smoke app on 3100/4100 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/login.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

> existing-user authentication form with show-password toggle and forgot link

## Procedure

1. `mcp__playwright__browser_navigate` → `/login` (use APP_BASE)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/login.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) where needed; public routes call `page.goto` directly.

## Elements

| selector / accessible name             | role               | expected behavior on interaction    | success signal                          | failure signal                |
| -------------------------------------- | ------------------ | ----------------------------------- | --------------------------------------- | ----------------------------- |
| `input[type=email]`                    | email              | email field — required              | value retained                          | no submit                     |
| `input[type=password]`                 | password           | password field — required           | masked input                            | no submit                     |
| `getByRole(button,{name:/show password | hide password/i})` | button                              | flips password input type               | type flips text↔password      | no toggle |
| `form button[type=submit]`             | button             | POST /api/users/log-in → /dashboard | redirect + access token in localStorage | inline alert, stays on /login |
| `link to /forgot-password`             | link               | navigates to /forgot-password       | URL ends /forgot-password               | no nav                        |

## Hidden surfaces opened from this page

(documented inline in the elements above where applicable — e.g.
transfer/refund forms expand from the same card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger               | method | path              | what request body or query is expected |
| --------------------- | ------ | ----------------- | -------------------------------------- |
| form submit (valid)   | POST   | /api/users/log-in | {email, password}                      |
| form submit (invalid) | POST   | /api/users/log-in | {email, wrong-password} → 401          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
