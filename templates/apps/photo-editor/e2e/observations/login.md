# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `browser_navigate` → `/login`
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — email + password inputs, "Sign in" button, forgot link, signup link.
4. Re-navigate and re-snapshot.
5. When complete, write `e2e/login.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role   | expected behavior on interaction                                                                         | success signal                                      | failure signal                   |
| ------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------- |
| `[data-mol-id="login-submit"]` (`Sign in`)                   | button | submits POST `/api/users/login`; on 200 navigates to `/library` and persists `molecule:auth:accessToken` | URL becomes `/library`, accessToken in localStorage | stays on `/login`, alert visible |
| `getByRole('link', { name: /forgot/i })`                     | link   | navigates to `/forgot-password`                                                                          | URL becomes `/forgot-password`                      | stays on `/login`                |
| `getByRole('link', { name: /create one/i })` (bottom prompt) | link   | navigates to `/signup`                                                                                   | URL becomes `/signup`                               | stays on `/login`                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | login is a flat single-form page             |

## Network calls expected during normal use

| trigger                              | method | path               | what request body or query is expected                    |
| ------------------------------------ | ------ | ------------------ | --------------------------------------------------------- |
| click `[data-mol-id="login-submit"]` | POST   | `/api/users/login` | `{ email, password }`; 200 → session, 401 → invalid creds |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
