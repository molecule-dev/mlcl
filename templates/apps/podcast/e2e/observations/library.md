# Page observations: /library (Library)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /library --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/library.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/library.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction   | success signal                               | failure signal   |
| ---------------------------------------------------- | ------- | ---------------------------------- | -------------------------------------------- | ---------------- |
| `getByRole('heading', { name: /your library/i })`    | heading | page heading                       | h1 visible                                   | no h1            |
| `getByRole('button', { name: /subscribed shows/i })` | button  | tab — subscribed shows (default)   | aria-pressed=true                            | no pressed state |
| `getByRole('button', { name: /saved episodes/i })`   | button  | tab — saved episodes               | aria-pressed=true after click, list switches | no switch        |
| `page.locator('a[href^="/shows/"]').first()`         | link    | subscribed show card → /shows/:id  | URL changes to show detail                   | no nav           |
| `page.locator('a[href^="/episodes/"]').first()`      | link    | saved episode card → /episodes/:id | URL changes to episode player                | no nav           |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger        | method | path                     | what request body or query is expected      |
| -------------- | ------ | ------------------------ | ------------------------------------------- |
| initial render | GET    | /api/subscriptions/shows | 200 with seeded subscriptions (2 shows)     |
| initial render | GET    | /api/episodes?saved=true | 200 with seeded saved-episode list          |
| hero card      | GET    | /api/reports/now-playing | 200 with current listening state (or empty) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
