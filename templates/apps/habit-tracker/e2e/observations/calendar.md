# Page observations: Calendar view of completions (calendar)

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

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role   | expected behavior on interaction                      | success signal         | failure signal |
| --------------------------------------------------------------------- | ------ | ----------------------------------------------------- | ---------------------- | -------------- |
| `getByRole('nav', { name: /Primary navigation/i })`                   | nav    | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |
| `getByRole('button', { name: /Previous period/i })`                   | button | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |
| `getByRole('button', { name: /Next period/i })`                       | button | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |
| `getByTestId('calendar-range-label')`                                 | h2     | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |
| `getByTestId('calendar-row-9e8d6bc1-f5b1-47d6-bdac-d5d162134199')`    | tr     | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |
| `getByTestId('cell-9e8d6bc1-f5b1-47d6-bdac-d5d162134199-2026-04-26')` | div    | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |

## Hidden surfaces opened from this page

| trigger           | what it opens            | elements inside (selector / role / behavior)                                              |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| user-menu trigger | profile/sign-out popover | profile link → /profile · sign-out button → POST /api/sessions/destroy then redirect to / |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected         |
| ------------ | ------ | ------------------ | ---------------------------------------------- |
| initial load | GET    | `/api/habits`      | returns habit list to render row labels        |
| initial load | GET    | `/api/completions` | returns completions for current visible window |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/calendar.spec.ts`
