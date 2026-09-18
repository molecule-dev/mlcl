# Page observations: /forgot-password (Reset request)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/forgot-password.spec.ts).

> public reset-link request form. POSTs `/api/users/forgot-password`
> with `{email}` and shows an "inbox" confirmation message.

## Procedure

1. `mcp__playwright__browser_navigate` → `/forgot-password`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/forgot-password.spec.ts`.

## Page state assumed

- [x] Public — `page.goto('/forgot-password')` directly.

## Elements

| selector / accessible name      | role    | expected behavior on interaction                            | success signal                             | failure signal        |
| ------------------------------- | ------- | ----------------------------------------------------------- | ------------------------------------------ | --------------------- |
| `heading "Reset your password"` | heading | renders form heading                                        | h2 visible                                 | missing               |
| `textbox "Email mail"`          | textbox | required email input                                        | typed value preserved                      | missing               |
| `button "Send reset link"`      | button  | POSTs `/api/users/forgot-password`, shows confirmation copy | inbox/sent/reset-link confirmation visible | error toast / no POST |
| `link "Sign in"` (`/login`)     | link    | navigate to login form                                      | URL ends `/login`                          | no nav                |
| `link "schedule Chrono"` (`/`)  | link    | back to landing                                             | URL is `/`                                 | no nav                |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/forgot-password | { email } → 200                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
