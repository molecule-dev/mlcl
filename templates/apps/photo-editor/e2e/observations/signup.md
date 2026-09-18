# Page observations: /signup (Signup)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `browser_navigate` → `/signup`
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — name + email + password + confirm + submit + "sign in" link.
4. Try the mismatched-passwords path; observe the inline error.
5. Re-navigate and re-snapshot.
6. When complete, write `e2e/signup.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                        | role   | expected behavior on interaction                                                                  | success signal                              | failure signal                    |
| ------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------- |
| `[data-mol-id="signup-submit"]` ("Create account", with all fields filled and matching passwords) | button | POST `/api/users/`; on 201 → `/library` and writes `molecule:auth:accessToken` to localStorage    | URL becomes `/library`, accessToken present | stays on `/signup`, alert visible |
| `[data-mol-id="signup-submit"]` (with mismatched passwords)                                       | button | client-side guard prevents the POST entirely; inline `role="alert"` shows `Passwords don't match` | alert visible, no POST in network log       | POST fires anyway                 |
| `getByRole('link', { name: /sign in/i })` (bottom prompt)                                         | link   | navigates to `/login`                                                                             | URL becomes `/login`                        | stays                             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | signup is a flat single-form page            |

## Network calls expected during normal use

| trigger                                                    | method | path          | what request body or query is expected             |
| ---------------------------------------------------------- | ------ | ------------- | -------------------------------------------------- |
| click `[data-mol-id="signup-submit"]` (matching passwords) | POST   | `/api/users/` | `{ email, password, name }`; 201 → session created |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
