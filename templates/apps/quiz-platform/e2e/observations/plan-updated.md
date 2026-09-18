# Page observations: /plan-updated

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Public route; reachable post-checkout. Behavior changes based on auth state: signed-in shows "Back to discover", anonymous shows "Back to home".

## Elements

| selector / accessible name                             | role              | expected behavior on interaction | success signal  | failure signal |
| ------------------------------------------------------ | ----------------- | -------------------------------- | --------------- | -------------- |
| `getByTestId('plan-updated')`                          | landmark `<main>` | rendered                         | element visible | missing        |
| `getByRole('heading', { name: /your plan is live/i })` | h1                | rendered                         | visible         | missing        |
| Body copy "Thanks for upgrading…"                      | paragraph         | rendered                         | visible         | missing        |
| `getByTestId('plan-updated-back')` (signed-in)         | link              | navigates to /discover           | URL = /discover | otherwise      |
| `getByTestId('plan-updated-back')` (anonymous)         | link              | navigates to /                   | URL = /         | otherwise      |

## Network calls expected during normal use

| trigger                    | method | path | body   |
| -------------------------- | ------ | ---- | ------ |
| (none — confirmation page) | —      | —    | no XHR |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] both anonymous + signed-in CTA destinations covered
- [x] heading + body copy covered
- [x] no console errors
- [x] all rows have a corresponding test in `e2e/plan-updated.spec.ts`
