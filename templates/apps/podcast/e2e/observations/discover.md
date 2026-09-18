# Page observations: /discover (Discover)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /discover --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/discover.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/discover.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction   | success signal                           | failure signal     |
| --------------------------------------------------------- | ------- | ---------------------------------- | ---------------------------------------- | ------------------ |
| `getByRole('heading', { name: /^discover$/i, level: 1 })` | heading | main page heading                  | h1 visible                               | no h1              |
| `getByRole('heading', { name: /featured shows/i })`       | heading | featured row title                 | h2 visible                               | no row             |
| `getByRole('heading', { name: /trending now/i })`         | heading | trending row title                 | h2 visible                               | no row             |
| `getByRole('heading', { name: /browse all shows/i })`     | heading | category-filter section            | h2 visible                               | no grid            |
| `getByRole('button', { name: /^all$/i })`                 | button  | category filter — All (default)    | aria-pressed=true on All                 | no pressed state   |
| `getByRole('button', { name: /^tech$/i })`                | button  | category filter — Tech             | aria-pressed=true on Tech, grid filtered | no filter          |
| `getByRole('link', { name: /play/i }).first()`            | link    | hero "Play · NN m" → /episodes/:id | URL changes to episode player            | still on /discover |
| `getByRole('link', { name: /view show/i }).first()`       | link    | hero "View show" → /shows/:id      | URL changes to show detail               | still on /discover |
| `page.locator('a[href^="/shows/"]').first()`              | link    | show card link → /shows/:id        | URL is /shows/<uuid>                     | click no-op        |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger        | method | path                     | what request body or query is expected             |
| -------------- | ------ | ------------------------ | -------------------------------------------------- |
| initial render | GET    | /api/shows               | 200 with seeded catalog of 8 decorated shows       |
| initial render | GET    | /api/episodes            | 200 with seeded list of recent episodes            |
| hero card      | GET    | /api/reports/now-playing | 200 with most-recent listening progress (or empty) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
