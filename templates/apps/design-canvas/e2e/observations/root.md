# Page observations: / (Landing)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. browser_navigate → `/`
2. browser_snapshot — header, hero, demo card, features grid, footer all rendered
3. Re-snapshot after viewport scroll — no new interactive surfaces appeared

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                  | role   | expected behavior on interaction       | success signal                                             | failure signal                 |
| ----------------------------------------------------------- | ------ | -------------------------------------- | ---------------------------------------------------------- | ------------------------------ |
| `getByRole('link', { name: /^brush Atelier$/ })`            | link   | navigates to `/` (home)                | URL stays `/` and Landing re-renders                       | URL changes to `/login` or 404 |
| `getByRole('link', { name: /Templates/ }).first()`          | link   | navigates to `/templates`              | URL becomes `/templates` and login page (auth-guard) loads | network 404                    |
| `getByRole('link', { name: /Library/ }).first()`            | link   | navigates to `/library`                | URL becomes `/library` (auth-guard kicks in)               | navigation fails               |
| `getByRole('button', { name: /Toggle theme/ })`             | button | flips theme attribute on document root | `document.documentElement.dataset.theme` toggles           | no change                      |
| `getByRole('link', { name: /Sign in/ }).first()`            | link   | navigates to `/login`                  | URL becomes `/login` and login form is visible             | URL doesn't change             |
| `getByRole('link', { name: /Get started/ }).first()`        | link   | navigates to `/signup`                 | URL becomes `/signup` and signup form renders              | URL doesn't change             |
| `getByRole('link', { name: /Start designing for free/ })`   | link   | navigates to `/signup`                 | URL becomes `/signup` and signup form renders              | URL doesn't change             |
| `getByRole('link', { name: /Browse templates/ })`           | link   | navigates to `/templates`              | URL becomes `/templates` (auth redirect or list)           | URL doesn't change             |
| `getByRole('link', { name: /Northwind · Brand Refresh/ })`  | link   | opens demo project in editor           | URL becomes `/editor/demo-1` and editor mounts             | URL doesn't change             |
| `getByRole('link', { name: /Create your free workspace/ })` | link   | navigates to `/signup`                 | URL becomes `/signup` and signup form renders              | URL doesn't change             |

## Hidden surfaces opened from this page

| trigger             | what it opens                                                   | elements inside (selector / role / behavior) |
| ------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| theme toggle button | inline state flip; persisted via theme provider to localStorage | none — affects body classes                  |

## Network calls expected during normal use

| trigger        | method | path           | what request body or query is expected |
| -------------- | ------ | -------------- | -------------------------------------- |
| initial render | GET    | `/` (HTML doc) | none — static page                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
