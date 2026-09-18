# Page observations: /queue (Queue)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /queue --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/queue.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/queue.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role    | expected behavior on interaction    | success signal                              | failure signal   |
| ------------------------------------------------------------- | ------- | ----------------------------------- | ------------------------------------------- | ---------------- |
| `getByRole('heading', { name: /up next/i })`                  | heading | page heading                        | h1 visible                                  | no h1            |
| `getByRole('button', { name: /clear queue/i })`               | button  | DELETE /api/queue, empties list     | list becomes empty + persists across reload | no DELETE issued |
| `getByRole('button', { name: /^play$/i }).first()`            | button  | start playback of queued episode    | now-playing bar populates                   | no playback      |
| `getByRole('button', { name: /remove from queue/i }).first()` | button  | DELETE /api/queue/:id, removes item | item disappears from list                   | no DELETE issued |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger           | method | path           | what request body or query is expected |
| ----------------- | ------ | -------------- | -------------------------------------- |
| initial render    | GET    | /api/queue     | 200 with seeded queue (1 item)         |
| Remove from queue | DELETE | /api/queue/:id | 204 on success                         |
| Clear queue       | DELETE | /api/queue     | 204 on success                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
