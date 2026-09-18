# Page observations: / (Root / Landing)

> Captured live via Playwright MCP against the running dev server on
> `http://localhost:3070/` after a fresh signup-less navigation.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                             | role   | expected behavior on interaction                                      | success signal                                             | failure signal                             |
| ---------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `getByRole('link', { name: /Verso/ })` (header brand)                  | link   | navigate back to `/`                                                  | URL is `/`, hero heading visible                           | URL unchanged or page errors               |
| `getByRole('link', { name: 'Features' })`                              | link   | jump to `#features` anchor                                            | URL contains `#features`                                   | URL unchanged                              |
| `getByRole('link', { name: 'Pricing' })`                               | link   | navigate to `/pricing`                                                | URL becomes `/pricing`, pricing heading visible            | URL unchanged                              |
| `getByRole('link', { name: 'About' })`                                 | link   | open `https://www.molecule.dev`                                       | new tab/window or external nav                             | nothing happens                            |
| `getByRole('button', { name: /toggle theme/i })`                       | button | flip `<html data-theme>` between dark/light, persists in localStorage | `documentElement.dataset.theme` swaps; reload preserves it | aria-pressed changes but `<html>` does not |
| `getByRole('link', { name: 'Sign in' })` (header)                      | link   | navigate to `/login`                                                  | URL is `/login`, login form visible                        | URL unchanged                              |
| `getByRole('link', { name: 'Get started' })` (header)                  | link   | navigate to `/signup`                                                 | URL is `/signup`, signup form visible                      | URL unchanged                              |
| `getByRole('link', { name: /Start your knowledge base/i })` (hero CTA) | link   | navigate to `/signup`                                                 | URL is `/signup`                                           | URL unchanged                              |
| `getByRole('link', { name: /I already have an account/i })`            | link   | navigate to `/login`                                                  | URL is `/login`                                            | URL unchanged                              |
| `getByRole('link', { name: /Create my workspace/i })` (footer CTA)     | link   | navigate to `/signup`                                                 | URL is `/signup`                                           | URL unchanged                              |
| `getByRole('link', { name: 'Pricing' })` (footer)                      | link   | navigate to `/pricing`                                                | URL is `/pricing`                                          | URL unchanged                              |
| `getByRole('link', { name: 'Sign in' })` (footer)                      | link   | navigate to `/login`                                                  | URL is `/login`                                            | URL unchanged                              |

## Hidden surfaces opened from this page

| trigger                                           | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — landing has no menus, modals, or drawers) | —             | —                                            |

## Network calls expected during normal use

| trigger           | method | path                                    | what request body or query is expected                       |
| ----------------- | ------ | --------------------------------------- | ------------------------------------------------------------ |
| initial page load | GET    | `/api/billing/tiers` (optional preload) | no body, returns plan list (only if pricing teaser is wired) |
| theme toggle      | none   | none                                    | client-side only, persists to `localStorage`                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
