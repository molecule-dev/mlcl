# Page observations: / (Landing)

> Captured anonymously (no auth) — visitor's first impression.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                   | role    | expected behavior on interaction                            | success signal                   | failure signal  |
| ---------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- | -------------------------------- | --------------- |
| `getByRole('link', { name: 'Snagr' }).first()`                               | link    | nav to /#top (back to top of landing)                       | URL stays on `/`                 | navigation away |
| `getByRole('link', { name: /sign in/i }).first()`                            | link    | nav to /login                                               | URL becomes `/login`             | stays on `/`    |
| `getByRole('link', { name: /sign up free/i })`                               | link    | nav to /signup                                              | URL becomes `/signup`            | stays on `/`    |
| `getByRole('link', { name: /start saving free/i })`                          | link    | nav to /signup                                              | URL becomes `/signup`            | stays on `/`    |
| `getByRole('link', { name: /browse deals/i })`                               | link    | nav to /deals (auth-guarded)                                | URL becomes `/deals` or `/login` | stays on `/`    |
| `getByRole('link', { name: 'View all' }).first()`                            | link    | nav to /deals                                               | URL becomes `/deals` or `/login` | stays on `/`    |
| `getByRole('heading', { name: /grab it before it's gone/i, level: 1 })`      | heading | renders hero headline                                       | visible                          | missing         |
| `getByRole('heading', { name: /snag these before they vanish/i, level: 2 })` | heading | renders trending section                                    | visible                          | missing         |
| `page.locator('article').first()`                                            | article | renders one of 4 trending deal cards from /api/deals/public | ≥4 articles                      | empty           |
| `getByRole('link', { name: /create my free account/i })`                     | link    | nav to /signup                                              | URL becomes `/signup`            | stays on `/`    |

## Hidden surfaces opened from this page

| trigger                            | what it opens | elements inside |
| ---------------------------------- | ------------- | --------------- |
| (none — all CTAs are direct links) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                      | expected body                       |
| --------- | ------ | ------------------------- | ----------------------------------- |
| Page load | GET    | /api/deals/public?limit=4 | array of 4 active deals (decorated) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
