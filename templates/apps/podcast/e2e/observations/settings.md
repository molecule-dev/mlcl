# Page observations: /settings (Settings)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /settings --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/settings.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/settings.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role       | expected behavior on interaction                | success signal                          | failure signal |
| --------------------------------------------------------- | ---------- | ----------------------------------------------- | --------------------------------------- | -------------- |
| `getByRole('heading', { name: /^settings$/i, level: 1 })` | heading    | page heading                                    | h1 visible                              | no h1          |
| `getByRole('button', { name: /^playback$/i })`            | button     | section — playback (default)                    | h2 "Playback" visible                   | no section     |
| `getByRole('button', { name: /^downloads$/i })`           | button     | section — downloads                             | h2 "Downloads" visible after click      | no switch      |
| `getByRole('button', { name: /^notifications$/i })`       | button     | section — notifications prefs                   | h2 "Notifications" visible after click  | no switch      |
| `getByRole('textbox', { name: /default speed/i })`        | textbox    | change default playback speed                   | value persists via PUT, survives reload | no PUT         |
| `getByRole('spinbutton', { name: /skip-back/i })`         | spinbutton | change skip-back interval                       | value persists across reload            | no persistence |
| `getByRole('checkbox', { name: /voice boost/i })`         | checkbox   | toggle voice boost                              | state flips and survives reload         | state resets   |
| `getByRole('checkbox', { name: /trim silence/i })`        | checkbox   | toggle trim silence (default checked)           | state flips and persists                | state resets   |
| `getByRole('checkbox', { name: /auto-play next/i })`      | checkbox   | toggle auto-play next episode (default checked) | state flips and persists                | state resets   |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger           | method | path                     | what request body or query is expected |
| ----------------- | ------ | ------------------------ | -------------------------------------- |
| initial render    | GET    | /api/profile/preferences | 200 with current playback prefs        |
| change preference | PUT    | /api/profile/preferences | 200 with persisted prefs               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
