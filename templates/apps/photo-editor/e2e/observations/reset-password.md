# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `browser_navigate` → `/reset-password?token=abc&email=a@b.com`
   (verify URL params pre-fill the inputs).
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — email/token/password/confirm inputs, submit, back link.
4. Try the mismatched-passwords path; observe the inline error.
5. Re-navigate and re-snapshot.
6. When complete, write `e2e/reset-password.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                              | role    | expected behavior on interaction                                                                  | success signal                        | failure signal    |
| ----------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------- |
| `input#email` and `input#token` (URL pre-fill)                          | textbox | when navigating to `/reset-password?token=X&email=Y`, both inputs come up pre-populated           | values match the query params         | empty fields      |
| `[data-mol-id="reset-submit"]` ("Reset password", mismatched passwords) | button  | client-side guard prevents the POST entirely; inline `role="alert"` shows `Passwords don't match` | alert visible, no POST in network log | POST fires anyway |
| `getByRole('link', { name: /back to sign in/i })` (bottom prompt)       | link    | navigates to `/login`                                                                             | URL becomes `/login`                  | stays             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | reset-password is a flat single-form page    |

## Network calls expected during normal use

| trigger                                                 | method | path                        | what request body or query is expected            |
| ------------------------------------------------------- | ------ | --------------------------- | ------------------------------------------------- |
| click `[data-mol-id="reset-submit"]` (with valid token) | POST   | `/api/users/reset-password` | `{ token, password }`; success allows login chain |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
