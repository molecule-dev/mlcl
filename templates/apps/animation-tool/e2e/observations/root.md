# Page observations: / (Landing)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` + dump of
> all `<button>`, `<a>`, `<input>` nodes.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                            | role    | expected behavior on interaction                              | success signal       | failure signal |
| --------------------------------------------------------------------- | ------- | ------------------------------------------------------------- | -------------------- | -------------- |
| `getByRole('heading', { name: /Motion brought to life/i, level: 1 })` | heading | render landing hero                                           | visible              | absent         |
| `getByRole('link', { name: /Sign in/i }).first()`                     | link    | navigate to /login                                            | URL becomes /login   | stays on /     |
| `getByRole('link', { name: /Start animating/i }).first()`             | link    | navigate to /signup                                           | URL becomes /signup  | stays          |
| `getByRole('link', { name: /Open Vivace/i })`                         | link    | navigate to /login                                            | URL becomes /login   | stays          |
| `getByRole('link', { name: /Privacy/i })`                             | link    | navigate to /privacy                                          | URL becomes /privacy | stays          |
| `getByRole('link', { name: /Terms/i })`                               | link    | navigate to /terms                                            | URL becomes /terms   | stays          |
| `getByRole('link', { name: /Pricing/i })`                             | link    | navigate to /pricing                                          | URL becomes /pricing | stays          |
| sample-project link cards                                             | link    | navigate to /projects/sample-* (auth gates redirect to login) | URL changes          | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| page load | GET    | (none — static page) | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
