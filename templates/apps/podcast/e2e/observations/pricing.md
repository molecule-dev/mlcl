# Page observations: /pricing (Pricing)

> Filled from real Playwright walks captured by `scripts/observe-page.mjs`.
> Re-run that script to refresh the artifacts under `_artifacts/`.

## Procedure

1. `node scripts/observe-page.mjs podcast /pricing --vite-port 3090 --api-port 4090`
2. Compare `_artifacts/pricing.a11y.json` against the table below.
3. Click any tab/menu/etc., re-snapshot, append rows.
4. Stop when one full re-pass adds nothing new.
5. Each row below has a matching test in `e2e/pricing.spec.ts`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction           | success signal           | failure signal      |
| ------------------------------------------- | ------- | ------------------------------------------ | ------------------------ | ------------------- |
| `getByRole('heading', { level: 1 })`        | heading | page heading "Choose your Wavelength plan" | h1 visible               | no h1               |
| `getByRole('heading', { name: /^free$/i })` | heading | Free tier card heading                     | h2 visible               | no Free tier        |
| `getByRole('heading', { name: /^pro$/i })`  | heading | Pro tier card heading                      | h2 visible               | no Pro tier         |
| `getByRole('heading', { name: /^team$/i })` | heading | Team tier card heading                     | h2 visible               | no Team tier        |
| `getByText(/episodes/i).first()`            | text    | limit row — episodes                       | visible inside tier list | limits not rendered |
| `getByText(/shows/i).first()`               | text    | limit row — shows                          | visible inside tier list | limits not rendered |
| `getByText(/subscriptions/i).first()`       | text    | limit row — subscriptions                  | visible inside tier list | limits not rendered |

## Hidden surfaces opened from this page

| trigger                                              | what it opens                              | elements inside (selector / role / behavior)                                                                                                |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| user-menu button (sidebar avatar, authed pages only) | popover with Library + Settings + Sign out | `getByRole('link', { name: /library/i })` (link), `getByRole('link', { name: /settings/i })` (link), `getByRole('button', { name: /sign out | log out/i })` (button — clears session) |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected |
| -------------- | ------ | ------------------ | -------------------------------------- |
| initial render | GET    | /api/billing/tiers | 200 with tier ladder + per-tier limits |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/<page>.spec.ts`
