# Page observations: / (Landing)

> Filled from a Playwright MCP walk of the live app at
> `http://localhost:3030/`. Public, no auth.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                                      | success signal               | failure signal        |
| --------------------------------------------------------- | ------- | --------------------------------------------------------------------- | ---------------------------- | --------------------- |
| `getByRole('link', { name: /^Fugue$/ })`                  | link    | brand mark, links back to `/`                                         | `href="/"`, stays on landing | missing or 404        |
| `getByRole('link', { name: /^Sign in$/i }).first()`       | link    | nav top-right, routes to `/login`                                     | URL becomes `/login`         | stays on `/`          |
| `getByRole('link', { name: /open the studio/i }).first()` | link    | nav CTA, routes to `/signup`                                          | URL becomes `/signup`        | stays on `/`          |
| `getByRole('link', { name: /start producing/i }).first()` | link    | hero CTA, routes to `/signup`                                         | URL becomes `/signup`        | stays on `/`          |
| `getByRole('heading', { name: /Layer everything/i })`     | heading | hero h1 with brand value-prop                                         | h1 visible                   | placeholder/empty     |
| `getByRole('heading', { name: /Unlimited tracks/i })`     | heading | feature card title                                                    | visible in features grid     | missing               |
| `getByRole('heading', { name: /samples/i }).first()`      | heading | "20k royalty-free samples" feature                                    | visible                      | missing               |
| `getByRole('heading', { name: /mixer/i })`                | heading | "Studio-grade mixer" feature                                          | visible                      | missing               |
| `getByRole('heading', { name: /collaboration/i })`        | heading | "Live collaboration" feature                                          | visible                      | missing               |
| `getByText(/© 20\d\d.*Fugue/)`                            | text    | footer copyright with current year                                    | visible                      | missing or wrong year |
| bottom CTA                                                | link    | secondary "Start producing" link near footer also routes to `/signup` | URL becomes `/signup`        | stays on `/`          |

## Hidden surfaces opened from this page

| trigger | what it opens                                            | elements inside (selector / role / behavior) |
| ------- | -------------------------------------------------------- | -------------------------------------------- |
| (none)  | landing has no menus/modals/tabs — pure marketing scroll | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path   | what request body or query is expected             |
| ------------ | ------ | ------ | -------------------------------------------------- |
| initial load | n/a    | (none) | landing makes no `/api/*` requests; marketing only |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
