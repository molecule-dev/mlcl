# Page observations: / (Landing)

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/`.
> The marketing landing renders without auth.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                  | role    | expected behavior on interaction    | success signal                                    | failure signal         |
| --------------------------------------------------------------------------- | ------- | ----------------------------------- | ------------------------------------------------- | ---------------------- |
| `getByRole('link', { name: /^Refract$/ })`                                  | link    | navigates to in-page anchor `/#top` | URL ends with `#top`, page does not navigate away | hard-navigates off `/` |
| `getByRole('link', { name: /Sign in/ }).first()`                            | link    | navigates to `/login`               | URL becomes `/login`, login form visible          | stays on `/`           |
| `getByRole('link', { name: /Get Refract free/ })`                           | link    | navigates to `/signup`              | URL becomes `/signup`, signup form visible        | stays on `/`           |
| `getByRole('link', { name: /Connect your first repo/ }).first()`            | link    | navigates to `/signup` (hero CTA)   | URL becomes `/signup`                             | stays on `/`           |
| `getByRole('heading', { name: /Code in a new light/ })`                     | heading | renders the hero headline           | heading text visible                              | element missing        |
| `getByRole('heading', { name: /Built for developers who actually merge/ })` | heading | renders feature-grid section        | heading visible                                   | element missing        |
| `getByRole('heading', { name: /AI quality scoring/ })`                      | heading | feature card 1 visible              | text visible                                      | missing                |
| `getByRole('heading', { name: /GitHub-native flow/ })`                      | heading | feature card 2 visible              | text visible                                      | missing                |
| `getByRole('heading', { name: /Bring your rules/ })`                        | heading | feature card 3 visible              | text visible                                      | missing                |
| `getByRole('heading', { name: /Reports your team reads/ })`                 | heading | feature card 4 visible              | text visible                                      | missing                |
| `getByRole('contentinfo')`                                                  | footer  | renders copyright with year         | "© 2026" + "Refract"                              | footer missing         |

## Hidden surfaces opened from this page

| trigger | what it opens                               | elements inside (selector / role / behavior) |
| ------- | ------------------------------------------- | -------------------------------------------- |
| (none)  | landing has no menus, modals, or accordions | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path   | what request body or query is expected                |
| ------------ | ------ | ------ | ----------------------------------------------------- |
| initial load | (none) | (none) | landing page is fully static — no `/api/*` calls fire |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none exist)
- [x] Every form has every field documented (no forms on landing)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
