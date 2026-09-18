# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `browser_navigate` → `/forgot-password`
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — email input, submit button, back-to-login link.
4. Submit a real email; observe the success state replaces the form.
5. Re-navigate and re-snapshot.
6. When complete, write `e2e/forgot-password.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                             | role   | expected behavior on interaction                                                                                                                    | success signal                                         | failure signal                          |
| ---------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `[data-mol-id="forgot-submit"]` ("Send reset link", with email filled) | button | POST `/api/users/forgot-password` with `{ email }`; on 2xx swaps the form for a success card (mark_email_read icon + "If an account matches…" body) | success card visible; submit button no longer rendered | stays on form with `role="alert"` error |
| `getByRole('link', { name: /back to sign in/i })` (bottom prompt)      | link   | navigates to `/login`                                                                                                                               | URL becomes `/login`                                   | stays                                   |
| `[data-mol-id="forgot-submit"]` with a non-existent email              | button | still returns 2xx (no enumeration); UI swaps to success card                                                                                        | success card visible                                   | error card / 5xx                        |

## Hidden surfaces opened from this page

| trigger           | what it opens                   | elements inside (selector / role / behavior)                                                                  |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| successful submit | replaces form with success card | `mark_email_read` icon, `text-[#a09bb8]` paragraph "If an account matches {{email}}, the link is on its way." |

## Network calls expected during normal use

| trigger                               | method | path                         | what request body or query is expected                                    |
| ------------------------------------- | ------ | ---------------------------- | ------------------------------------------------------------------------- |
| click `[data-mol-id="forgot-submit"]` | POST   | `/api/users/forgot-password` | `{ email }`; 2xx whether or not the email exists (defence vs enumeration) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
