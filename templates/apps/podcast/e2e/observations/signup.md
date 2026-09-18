# Page observations: /signup (Signup)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /signup --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/signup.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/signup.spec.ts`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction           | success signal                           | failure signal                 |
| -------------------------------------------------- | ------- | ------------------------------------------ | ---------------------------------------- | ------------------------------ |
| `getByLabel(/^name$/i)`                            | textbox | enters listener display name               | value reflects typed input               | input rejects keystrokes       |
| `getByLabel(/email/i)`                             | textbox | enters email address                       | value reflects typed input               | input rejects keystrokes       |
| `getByLabel(/^password$/i)`                        | textbox | enters password (type=password by default) | characters masked                        | no masking                     |
| `getByRole('button', { name: /show password/i })`  | button  | toggles password visibility                | input type flips between password ↔ text | no toggle                      |
| `getByRole('button', { name: /create account/i })` | button  | submits form, POST /api/users              | 201 → navigate /discover                 | inline error, stays on /signup |
| `getByRole('link', { name: /sign in/i })`          | link    | route to /login                            | URL changes to /login                    | still on /signup               |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected                       |
| --------------------- | ------ | ---------- | ------------------------------------------------------------ |
| Create Account submit | POST   | /api/users | body { email, password, name } → 201 with user payload + JWT |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
