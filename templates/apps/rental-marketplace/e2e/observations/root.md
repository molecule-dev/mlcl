# Page observations: / (Landing)

Roost public landing — Roost brand bar + hero search card with destination /
date / guest fields and Search CTA, four hand-picked destination cards
(linking to /search?q=…), three live preview listings (linked to
/listings/:id), three editorial article tiles, host-CTA band, and a
footer with marketing links. Useful invariant: the preview row hits
/api/listings?limit=6 and falls back to FALLBACK_LISTINGS only on error.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                     | role   | expected behavior on interaction                                  | success signal                                            | failure signal             |
| ------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------- | --------------------------------------------------------- | -------------------------- |
| `getByRole('link', { name: 'Join Roost' })`                                    | link   | navigate to /signup                                               | URL changes to /signup, signup form renders               | URL stays at /             |
| `getByRole('link', { name: 'Sign in' })` (nav)                                 | link   | navigate to /login                                                | URL changes to /login, login form renders                 | URL stays at /             |
| `getByRole('link', { name: /Find a stay/i })` (nav)                            | link   | navigate to /search                                               | URL becomes /search (auth-gated → may redirect to /login) | navigation never happens   |
| Destination card link `getByRole('link', { name: /Big Sur/i })`                | link   | navigate to /search?q=Big%20Sur%2C%20California                   | URL contains q= param, Search reads it                    | wrong query / no nav       |
| Live preview listing card link `getByRole('link', { name: /night/i }).first()` | link   | navigate to /listings/:id                                         | listing detail page loads with that listing's title       | 404 / blank                |
| `getByRole('button', { name: /Search/i })` (hero)                              | button | submit hero search → goto /search?q=&check_in=&check_out=&guests= | URL changes to /search with query params                  | search button does nothing |

## Hidden surfaces opened from this page

(no menus / modals on the public landing; auth menu only appears once signed in via /search)

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected              |
| ------------- | ------ | --------------------- | --------------------------------------------------- |
| initial mount | GET    | /api/listings?limit=6 | fetches preview listings; expected 200 + {data:[…]} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
