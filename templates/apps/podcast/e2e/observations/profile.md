# Page observations: /profile (Profile)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /profile --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/profile.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/profile.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction | success signal                          | failure signal |
| ------------------------------------------------------ | ------- | -------------------------------- | --------------------------------------- | -------------- |
| `getByRole('heading', { name: /listening profile/i })` | heading | page heading                     | h1 visible                              | no h1          |
| `getByRole('heading', { level: 2 })`                   | heading | user display name h2             | visible with email-derived name         | no h2          |
| `getByText(/^subscribed$/i).first()`                   | text    | subscribed-count stat label      | count = 2 reflects seeded subscriptions | wrong number   |
| `getByText(/^saved$/i).first()`                        | text    | saved-count stat label           | count = 1 reflects seeded saved episode | wrong number   |
| `getByText(/^completed$/i).first()`                    | text    | completed-count stat label       | count = 0 (no completed episodes yet)   | wrong number   |
| `getByRole('heading', { name: /up next/i })`           | heading | queue summary card               | h3 visible                              | no card        |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger        | method | path                     | what request body or query is expected                |
| -------------- | ------ | ------------------------ | ----------------------------------------------------- |
| initial render | GET    | /api/profile/me          | 200 with user, plan, subscriptions/saved/queue counts |
| hero card      | GET    | /api/reports/now-playing | 200 with last listening position                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
