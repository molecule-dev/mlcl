# Page observations: /sources

> Observed via Playwright at http://localhost:3080/sources — sources index
> rendered by `pages/Sources.tsx`. Shows seeded outlets with bias chips +
> "All / Following" filter.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role    | expected behavior on interaction                | success signal                          | failure signal               |
| ------------------------------------------------ | ------- | ----------------------------------------------- | --------------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /sources/i })`     | heading | renders the page title                          | visible                                 | missing                      |
| `getByRole('button', { name: /^All$/ })`         | button  | shows every source                              | filter active, all rendered             | inactive                     |
| `getByRole('button', { name: /^Following$/ })`   | button  | filters to followed sources only                | followed sources visible, others hidden | shows everyone               |
| Source card link `getByRole('link', { name: /BBC | NYT     | Reuters/i })`                                   | link                                    | navigates to /sources/{slug} | URL becomes /sources/{slug} | unchanged |
| Per-card Follow button                           | button  | toggles follow → POST /api/sources/:slug/follow | aria-pressed flips                      | aria static                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                      | what request body or query is expected |
| ------------ | ------ | ------------------------- | -------------------------------------- |
| Page load    | GET    | /api/sources              | source list with following=bool        |
| Follow click | POST   | /api/sources/:slug/follow | → { following: bool }                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/04-sources-follow.spec.ts`
