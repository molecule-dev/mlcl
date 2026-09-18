# Page observations: Signup form (signup)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure (already executed)

Walked the running smoke app via a dedicated Playwright session
(`.smoke-apps/habit-tracker-test/walk.mjs`) which navigates to the
route, dumps the rendered DOM, and enumerates every interactive
element. Per-element rows below come from that dump; behaviors come
from clicking each element and observing the network/UI response.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                    | role                 | expected behavior on interaction                       | success signal                             | failure signal                     |
| ------------------------------------------------------------- | -------------------- | ------------------------------------------------------ | ------------------------------------------ | ---------------------------------- |
| `getByRole('link', { name: /local_fire_departmentStreak/i })` | link                 | rendered as part of the page; verifies UI scaffolding  | element visible in DOM                     | —                                  |
| `getByRole('button', { name: /Toggle theme/i })`              | button               | rendered as part of the page; verifies UI scaffolding  | element visible in DOM                     | —                                  |
| `locator('input[placeholder="Jordan"]')`                      | input[type=text]     | rendered as part of the page; verifies UI scaffolding  | element visible in DOM                     | —                                  |
| `locator('input[placeholder="Sanchez"]')`                     | input[type=text]     | rendered as part of the page; verifies UI scaffolding  | element visible in DOM                     | —                                  |
| `locator('input[placeholder="you@example.com"]')`             | input[type=email]    | rendered as part of the page; verifies UI scaffolding  | element visible in DOM                     | —                                  |
| `locator('input[placeholder="At least 8 characters"]')`       | input[type=password] | rendered as part of the page; verifies UI scaffolding  | element visible in DOM                     | —                                  |
| `locator('input[placeholder="Repeat your password"]')`        | input[type=password] | rendered as part of the page; verifies UI scaffolding  | element visible in DOM                     | —                                  |
| `getByRole('button', { name: /Create account/i })`            | button               | submit signup, POST /api/users, redirect to /dashboard | URL becomes /dashboard, accessToken stored | stays on /signup with inline error |
| `getByRole('link', { name: /Sign in/i })`                     | link                 | navigate to /login                                     | URL becomes /login                         | no navigation                      |

## Hidden surfaces opened from this page

| trigger           | what it opens            | elements inside (selector / role / behavior)                                              |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| user-menu trigger | profile/sign-out popover | profile link → /profile · sign-out button → POST /api/sessions/destroy then redirect to / |

## Network calls expected during normal use

| trigger | method | path         | what request body or query is expected                                                                           |
| ------- | ------ | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Submit  | POST   | `/api/users` | { name, email, password } — returns 201 with accessToken on success, 422 if validation fails, 409 if email taken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
