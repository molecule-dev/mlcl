# Page observations: / (Landing)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast / --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/root.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/root.spec.ts`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction | success signal                  | failure signal       |
| --------------------------------------------------------- | ------- | -------------------------------- | ------------------------------- | -------------------- |
| `getByRole('link', { name: /wavelength/i })`              | link    | navigates to home (/)            | route still / and brand visible | route changes or 404 |
| `getByRole('link', { name: /^sign in$/i }).first()`       | link    | navigates to /login              | URL changes to /login           | still on /           |
| `getByRole('link', { name: /try free/i })`                | link    | navigates to /signup             | URL changes to /signup          | still on /           |
| `getByRole('link', { name: /start listening/i }).first()` | link    | navigates to /signup             | URL changes to /signup          | still on /           |
| `getByRole('heading', { level: 1 })`                      | heading | renders hero headline            | h1 visible                      | no h1 found          |
| `getByRole('link', { name: /^sign in$/i }).nth(1)`        | link    | hero secondary CTA → /login      | URL changes to /login           | still on /           |
| `getByRole('link', { name: /start listening/i }).last()`  | link    | bottom-page CTA → /signup        | URL changes to /signup          | still on /           |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger        | method | path | what request body or query is expected                 |
| -------------- | ------ | ---- | ------------------------------------------------------ |
| initial render | GET    | /    | renders public marketing page; no /api/ calls expected |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
