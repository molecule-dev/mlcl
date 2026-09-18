# Page observations: /terms

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Public; static legal copy.

## Elements

| selector / accessible name                            | role              | expected behavior on interaction | success signal  | failure signal |
| ----------------------------------------------------- | ----------------- | -------------------------------- | --------------- | -------------- |
| `getByTestId('terms-page')`                           | landmark `<main>` | rendered                         | element visible | missing        |
| `getByRole('heading', { name: /terms of service/i })` | h1                | rendered                         | heading visible | missing        |
| `getByRole('heading', { name: /your account/i })`     | h2                | rendered                         | heading visible | missing        |
| `getByRole('heading', { name: /^billing$/i })`        | h2                | rendered                         | heading visible | missing        |
| `getByRole('heading', { name: /acceptable use/i })`   | h2                | rendered                         | heading visible | missing        |
| `getByRole('link', { name: /back to home/i })`        | link              | navigates to /                   | URL = /         | otherwise      |

## Network calls expected during normal use

| trigger         | method | path | body   |
| --------------- | ------ | ---- | ------ |
| (none — static) | —      | —    | no XHR |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] heading hierarchy intact
- [x] back-to-home link works
- [x] no console errors
- [x] all rows have a corresponding test in `e2e/terms.spec.ts`
