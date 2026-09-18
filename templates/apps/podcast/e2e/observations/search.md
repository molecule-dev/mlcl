# Page observations: /search (Search)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /search --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/search.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/search.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role      | expected behavior on interaction      | success signal                             | failure signal   |
| ------------------------------------------------------- | --------- | ------------------------------------- | ------------------------------------------ | ---------------- |
| `getByRole('heading', { name: /^search$/i, level: 1 })` | heading   | page heading                          | h1 visible                                 | no h1            |
| `getByRole('searchbox')`                                | searchbox | enters query string                   | list filters as user types                 | no filtering     |
| `getByRole('button', { name: /^all$/i })`               | button    | filter — All (default)                | aria-pressed=true                          | no pressed state |
| `getByRole('button', { name: /^shows$/i })`             | button    | filter — shows-only                   | episode section hidden, shows list visible | no filtering     |
| `getByRole('button', { name: /^episodes$/i })`          | button    | filter — episodes-only                | shows section hidden, episodes visible     | no filtering     |
| `page.locator('a[href^="/shows/"]').first()`            | link      | show search result → /shows/:id       | URL changes to show detail                 | no nav           |
| `page.locator('a[href^="/episodes/"]').first()`         | link      | episode search result → /episodes/:id | URL changes to episode player              | no nav           |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger        | method | path                     | what request body or query is expected           |
| -------------- | ------ | ------------------------ | ------------------------------------------------ |
| initial render | GET    | /api/shows               | 200 — full catalog used as the search index      |
| initial render | GET    | /api/episodes            | 200 — full episode list used as the search index |
| hero card      | GET    | /api/reports/now-playing | 200 with last position (or empty)                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
