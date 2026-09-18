# Page observations: / (Landing)

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright at http://localhost:3230/. Rows reflect what was rendered
> after `browser_navigate` + `browser_snapshot`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                     | success signal              | failure signal          |
| ----------------------------------------------------------- | ------- | ---------------------------------------------------- | --------------------------- | ----------------------- |
| `getByRole('link', { name: /Waypoint/i })`                  | link    | nav back to /                                        | URL stays at /              | navigation failure      |
| `getByRole('link', { name: /Sign in/i }).first()`           | link    | navigates to /login                                  | URL is /login               | error toast / wrong URL |
| `getByRole('link', { name: /Start a free trip/i }).first()` | link    | navigates to /signup                                 | URL is /signup              | error toast / wrong URL |
| `getByRole('link', { name: /See a sample trip/i })`         | link    | scrolls to #preview anchor on the same page          | section visible             | nothing happens         |
| `getByRole('link', { name: /Open itinerary/i })`            | link    | follows /trips/tr-2026-iceland sample preview        | URL contains /trips/        | dead link               |
| `getByRole('link', { name: /Plan another trip/i })`         | link    | follows /trips/new (auth-gated, redirects to /login) | URL is /login or /trips/new | wrong URL               |
| `getByRole('link', { name: /Plan one of your own/i })`      | link    | navigates to /signup                                 | URL is /signup              | dead link               |
| `getByRole('link', { name: /Plan your first trip/i })`      | link    | navigates to /signup or /trips/new (auth dependent)  | URL changes off /           | nothing happens         |
| `getByRole('link', { name: /How it works/i })`              | link    | scrolls to #features                                 | section visible             | scroll fails            |
| `getByRole('link', { name: /Inside Waypoint/i })`           | link    | scrolls to #preview                                  | section visible             | scroll fails            |
| `getByRole('link', { name: /Create free account/i })`       | link    | navigates to /signup                                 | URL is /signup              | dead link               |
| `getByRole('heading', { name: /Plan it once/i })`           | heading | static H1 above the fold                             | visible                     | missing                 |

## Hidden surfaces opened from this page

| trigger                       | what it opens | elements inside (selector / role / behavior) |
| ----------------------------- | ------------- | -------------------------------------------- |
| (none — landing has no menus) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/landing.spec.ts`
