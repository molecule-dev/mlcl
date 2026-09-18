# Page observations: /forgot-password (ForgotPassword)

> Filled from a live walk via Playwright MCP at /forgot-password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                         | success signal                     | failure signal                            |
| ------------------------------------------------- | ------- | -------------------------------------------------------- | ---------------------------------- | ----------------------------------------- |
| `[data-mol-id="forgot-email"]` (Email)            | textbox | accept email value                                       | typed value reflected              | input rejects                             |
| `[data-mol-id="forgot-submit"]` (Send reset link) | button  | POST /api/users/forgot-password and show generic success | "check your inbox" message visible | toast/error and stays on /forgot-password |
| `[data-mol-id="forgot-back"]` (Back to sign in)   | link    | navigate to /login                                       | URL becomes /login                 | nav fails                                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                        | method | path                       | what request body or query is expected                            |
| ------------------------------ | ------ | -------------------------- | ----------------------------------------------------------------- |
| Submit (real or unknown email) | POST   | /api/users/forgot-password | `{ email }` always returns generic success — no email enumeration |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
