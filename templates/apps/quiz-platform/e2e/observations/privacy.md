# Page observations: /privacy

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Public; static legal copy.

## Elements

| selector / accessible name                                 | role              | expected behavior on interaction | success signal      | failure signal |
| ---------------------------------------------------------- | ----------------- | -------------------------------- | ------------------- | -------------- |
| `getByTestId('privacy-page')`                              | landmark `<main>` | rendered                         | element visible     | missing        |
| `getByRole('heading', { name: /privacy notice/i })`        | h1                | rendered                         | heading visible     | missing        |
| `getByRole('heading', { name: /what we store/i })`         | h2                | rendered                         | heading visible     | missing        |
| `getByRole('heading', { name: /who can see your data/i })` | h2                | rendered                         | heading visible     | missing        |
| `getByRole('heading', { name: /your controls/i })`         | h2                | rendered                         | heading visible     | missing        |
| Bullet list (`role=listitem`)                              | list item × 4     | rendered                         | 4 listitems visible | wrong count    |
| `getByRole('link', { name: /back to home/i })`             | link              | navigates to /                   | URL = /             | otherwise      |

## Network calls expected during normal use

| trigger         | method | path | body   |
| --------------- | ------ | ---- | ------ |
| (none — static) | —      | —    | no XHR |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] heading hierarchy intact
- [x] back-to-home link works
- [x] no console errors
- [x] all rows have a corresponding test in `e2e/privacy.spec.ts`
