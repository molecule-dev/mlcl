# Page observations: /plan-updated (PlanUpdated)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /plan-updated --auth --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/plan-updated.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/plan-updated.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role               | expected behavior on interaction | success signal        | failure signal                |
| -------------------------------------------- | ------------------ | -------------------------------- | --------------------- | ----------------------------- |
| `getByRole('heading', { level: 2 }).first()` | heading            | thank-you message h2             | h2 visible            | no h2                         |
| `getByRole('heading', { level: 2 }).nth(1)`  | heading            | second confirmation h2           | h2 visible            | only one h2                   |
| `getByRole('link', { name: /return home      | home/i }).first()` | link                             | "Return home" CTA → / | URL changes to / or /discover | still on /plan-updated |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger                     | method | path            | what request body or query is expected |
| --------------------------- | ------ | --------------- | -------------------------------------- |
| initial render (auth check) | GET    | /api/profile/me | 200 with user; page reads plan state   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
