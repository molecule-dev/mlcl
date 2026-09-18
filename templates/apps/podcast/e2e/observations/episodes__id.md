# Page observations: /episodes/:id (EpisodePlayer)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /episodes/:id --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/episodes__id.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/episodes__id.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction              | success signal                              | failure signal   |
| ------------------------------------------------- | ------- | --------------------------------------------- | ------------------------------------------- | ---------------- |
| `getByRole('heading', { level: 1 })`              | heading | episode title                                 | h1 visible with episode title               | no h1            |
| `page.getByRole('link').filter({ hasText: /←/ })` | link    | back-to-show link (decorated with show_title) | navigates to /shows/:id                     | no link          |
| `getByRole('button', { name: /play episode/i })`  | button  | main play button                              | visible                                     | missing play CTA |
| `getByRole('button', { name: /add to queue/i })`  | button  | queue this episode                            | POST /api/queue + episode appears in /queue | no enqueue       |
| `getByRole('button', { name: /transcript/i })`    | button  | tab — transcript                              | reveals transcript paragraphs               | no transcript    |
| `getByRole('button', { name: /^chapters$/i })`    | button  | tab — chapters (default)                      | lists 4 seeded chapter buttons              | no chapters      |
| `getByRole('button', { name: /^about$/i })`       | button  | tab — about/show notes                        | reveals about content                       | no about         |
| `getByRole('button', { name: /cold open/i })`     | button  | first chapter button — seeks to 0:00          | player position resets                      | no seek          |
| `getByRole('button', { name: /main story/i })`    | button  | mid-chapter button — seeks to 10:00           | player position jumps                       | no seek          |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger        | method | path              | what request body or query is expected               |
| -------------- | ------ | ----------------- | ---------------------------------------------------- |
| initial render | GET    | /api/episodes/:id | 200 with decorated episode (show_title, cover_index) |
| initial render | GET    | /api/chapters     | 200 with seeded chapters for the episode             |
| Add to queue   | POST   | /api/queue        | 201 with queue_item; episode_id matches              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
