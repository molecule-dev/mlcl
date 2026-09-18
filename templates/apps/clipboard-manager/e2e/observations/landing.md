# Page observations: / (Landing)

Source: live walk via Playwright + e2e/landing.spec.ts. Public marketing
surface — sticky nav, hero with CTAs, command-palette mockup card, dense
clip-list showcase, four feature cards, pricing CTA, footer.

## Page state assumed

- [x] Public (unauthenticated, no auth required)

## Elements

| selector / accessible name                                         | role                | expected behavior on interaction         | success signal                             | failure signal      |
| ------------------------------------------------------------------ | ------------------- | ---------------------------------------- | ------------------------------------------ | ------------------- |
| `getByRole('heading', { name: /copy once/i, level: 1 })` + tagline | heading             | hero h1 + subhead render above the fold  | both visible                               | missing/wrong copy  |
| Top nav `Sign in` + `Get Yank` links                               | link                | both links present in the sticky nav     | both visible                               | nav broken          |
| `getByRole('link', { name: /sign in/i })`                          | link                | navigates to /login                      | URL becomes /login + login heading visible | URL unchanged       |
| `getByRole('link', { name: /get yank                               | get clipboard/i })` | link                                     | navigates to /signup                       | URL becomes /signup | URL unchanged |
| Hero CTA `Try in browser`                                          | link                | navigates to /clips (or /login for anon) | URL becomes /clips or /login               | URL unchanged       |
| 4 feature cards: search / sync / palette / encrypted               | section             | each card heading visible                | all four visible                           | any missing         |
| Footer copyright                                                   | text                | renders current year                     | year matches `new Date().getFullYear()`    | wrong/missing       |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside (selector / role / behavior) |
| ------------------------------ | ------------- | -------------------------------------------- |
| (none — single static landing) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path | what request body or query is expected |
| ------------ | ------ | ---- | -------------------------------------- |
| initial load | GET    | /    | 200 SPA shell                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (n/a — no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/landing.spec.ts`
