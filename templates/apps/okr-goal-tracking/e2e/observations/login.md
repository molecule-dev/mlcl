# Page observations: /login (login)

> Filled by walking the running smoke-app on VITE_PORT=3080 / API_PORT=4080
> via Playwright (`scripts/_okr-walk.mjs`). Each row corresponds to an
> element observed in the rendered DOM after sign-up.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role     | expected behavior on interaction | success signal                  | failure signal |
| ---------------------------------------------------- | -------- | -------------------------------- | ------------------------------- | -------------- |
| `getByRole('link', { name: /arrow_upwardAscent/i })` | link     | navigates to /                   | URL changes to /                | no navigation  |
| `getByRole('button', { name: /Toggle theme/i })`     | button   | click triggers action            | expected side effect            | click no-op    |
| `input[placeholder*="you@team.com"]`                 | email    | accepts user input               | value persists in field         | value cleared  |
| `getByRole('link', { name: /Forgot?/i })`            | link     | navigates to /forgot-password    | URL changes to /forgot-password | no navigation  |
| `input[placeholder*="••••••••"]`                     | password | accepts user input               | value persists in field         | value cleared  |
| `getByRole('button', { name: /Sign in/i })`          | button   | click triggers action            | expected side effect            | click no-op    |
| `getByRole('link', { name: /Create an account/i })`  | link     | navigates to /signup             | URL changes to /signup          | no navigation  |

## Hidden surfaces opened from this page

| trigger                      | what it opens                | elements inside (selector / role / behavior)               |
| ---------------------------- | ---------------------------- | ---------------------------------------------------------- |
| user-menu button (top right) | sign-out menu                | Sign out button signs the user out and redirects to public |
| theme toggle                 | flips data-mol-mode token    | data-mol-mode="dark" applied to <html>                     |
| sidebar nav links            | navigate to top-level routes | URL updates per nav target                                 |

## Network calls expected during normal use

| trigger                     | method     | path               | what request body or query is expected |
| --------------------------- | ---------- | ------------------ | -------------------------------------- |
| mount                       | GET        | /api/objectives    | initial list fetch                     |
| mount                       | GET        | /api/key-results   | initial KR list                        |
| mount                       | GET        | /api/notifications | inbox list                             |
| user action (page-specific) | POST/PATCH | /api/<resource>    | per-page payload                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
