# Page observations: /notifications (Notifications)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /notifications --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/notifications.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/notifications.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role     | expected behavior on interaction                     | success signal                                        | failure signal      |
| -------------------------------------------------------------- | -------- | ---------------------------------------------------- | ----------------------------------------------------- | ------------------- |
| `getByRole('heading', { name: /^notifications$/i, level: 1 })` | heading  | page heading                                         | h1 visible                                            | no h1               |
| `getByRole('listitem').first()`                                | listitem | first notification card (welcome)                    | visible after seeded demo                             | empty list          |
| `getByRole('heading', { name: /welcome/i, level: 2 })`         | heading  | welcome notification title (humanised, not raw kind) | h2 "Welcome" visible                                  | shows raw "welcome" |
| `page.locator('a[href^="/episodes/"]').first()`                | link     | new-episode notification → /episodes/:id             | URL changes to player                                 | wrong route         |
| `getByRole('button', { name: /mark.*read/i })`                 | button   | mark all as read (when present)                      | POST /api/notifications/read-all, unread badges clear | no POST issued      |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger                  | method | path                        | what request body or query is expected        |
| ------------------------ | ------ | --------------------------- | --------------------------------------------- |
| initial render           | GET    | /api/notifications          | 200 with seeded welcome + new_episode entries |
| Mark all read (optional) | POST   | /api/notifications/read-all | 200 with { marked: N }                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
