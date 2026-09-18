# Page observations: /shows/:id (ShowDetail)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /shows/:id --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/shows__id.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/shows__id.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction       | success signal                                   | failure signal |
| --------------------------------------------------------- | ------- | -------------------------------------- | ------------------------------------------------ | -------------- |
| `getByRole('heading', { name: /edge cases/i, level: 1 })` | heading | show title                             | h1 visible with seeded show name                 | no h1          |
| `getByText(/cortex media/i).first()`                      | text    | publisher line (decorated server-side) | visible under title                              | no publisher   |
| `getByRole('button', { name: /play.*latest/i }).first()`  | button  | Play latest episode CTA                | visible                                          | missing CTA    |
| `getByRole('button', { name: /subscrib/i }).first()`      | button  | subscribe/unsubscribe toggle           | POST/DELETE issued, state persists across reload | no API call    |
| `page.locator('a[href^="/episodes/"]').first()`           | link    | episode list item → /episodes/:id      | URL changes to player                            | no nav         |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger        | method | path                       | what request body or query is expected |
| -------------- | ------ | -------------------------- | -------------------------------------- |
| initial render | GET    | /api/shows/:id             | 200 with decorated show + publisher    |
| initial render | GET    | /api/episodes              | 200 with episode list for the show     |
| Subscribe      | POST   | /api/subscriptions/:showId | 201 on first click                     |
| Unsubscribe    | DELETE | /api/subscriptions/:showId | 204 on second click                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
