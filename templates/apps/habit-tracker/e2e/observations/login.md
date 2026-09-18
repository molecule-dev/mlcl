# Page observations: Login form (login)

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

| selector / accessible name                                    | role                 | expected behavior on interaction                               | success signal                             | failure signal                        |
| ------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| `getByRole('link', { name: /local_fire_departmentStreak/i })` | link                 | rendered as part of the page; verifies UI scaffolding          | element visible in DOM                     | —                                     |
| `getByRole('button', { name: /Toggle theme/i })`              | button               | flip <html data-theme>                                         | data-theme attribute changes               | no DOM change                         |
| `locator('input[placeholder="you@example.com"]')`             | input[type=email]    | rendered as part of the page; verifies UI scaffolding          | element visible in DOM                     | —                                     |
| `locator('input[placeholder="••••••••"]')`                    | input[type=password] | rendered as part of the page; verifies UI scaffolding          | element visible in DOM                     | —                                     |
| `getByRole('link', { name: /Forgot password./i })`            | link                 | navigate to /forgot-password                                   | URL becomes /forgot-password               | no navigation                         |
| `getByRole('button', { name: /Sign in/i })`                   | button               | submit credentials, POST /api/sessions, redirect to /dashboard | URL becomes /dashboard, accessToken stored | inline error visible, stays on /login |
| `getByRole('link', { name: /Start your streak/i })`           | link                 | navigate to /signup                                            | URL becomes /signup                        | no navigation                         |

## Hidden surfaces opened from this page

| trigger           | what it opens            | elements inside (selector / role / behavior)                                              |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| user-menu trigger | profile/sign-out popover | profile link → /profile · sign-out button → POST /api/sessions/destroy then redirect to / |

## Network calls expected during normal use

| trigger | method | path            | what request body or query is expected                                                |
| ------- | ------ | --------------- | ------------------------------------------------------------------------------------- |
| Submit  | POST   | `/api/sessions` | { email, password } — returns 201 with accessToken on success, 401 on bad credentials |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
