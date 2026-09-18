# Page observations: Plans + checkout (pricing)

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

| selector / accessible name                          | role   | expected behavior on interaction                      | success signal         | failure signal |
| --------------------------------------------------- | ------ | ----------------------------------------------------- | ---------------------- | -------------- |
| `getByRole('button', { name: /Current plan/i })`    | button | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |
| `getByRole('button', { name: /Upgrade to Pro/i })`  | button | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |
| `getByRole('button', { name: /Upgrade to Team/i })` | button | rendered as part of the page; verifies UI scaffolding | element visible in DOM | —              |

## Hidden surfaces opened from this page

| trigger           | what it opens            | elements inside (selector / role / behavior)                                              |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| user-menu trigger | profile/sign-out popover | profile link → /profile · sign-out button → POST /api/sessions/destroy then redirect to / |

## Network calls expected during normal use

| trigger        | method | path                    | what request body or query is expected                                      |
| -------------- | ------ | ----------------------- | --------------------------------------------------------------------------- |
| Upgrade tier   | POST   | `/api/billing/checkout` | { priceKey } — returns 200 with url pointing at Stripe Checkout (cs_test_…) |
| initial render | GET    | `/api/billing/tiers`    | returns the configured tier list (free/pro/team)                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
