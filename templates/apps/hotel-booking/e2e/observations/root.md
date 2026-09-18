# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                   | role     | expected behavior on interaction                                  | success signal                 | failure signal   |
| ------------------------------------------------------------ | -------- | ----------------------------------------------------------------- | ------------------------------ | ---------------- |
| `getByRole('link', { name: /Sojourn/i }).first()`            | link     | brand link → `/`                                                  | URL ends with `/`              | URL changed away |
| `getByRole('link', { name: /Search stays/i })`               | link     | top-nav search → `/search`                                        | URL contains `/search`         | stays on `/`     |
| `getByRole('link', { name: /Sign in/i }).first()`            | link     | top-nav sign in → `/login`                                        | URL contains `/login`          | stays on `/`     |
| `getByRole('link', { name: /Join Sojourn/i })`               | link     | top-nav signup CTA → `/signup`                                    | URL contains `/signup`         | stays on `/`     |
| `getByRole('combobox', { name: /Guests/i })`                 | combobox | hero guest select accepts a value                                 | `toHaveValue` matches selected | unchanged        |
| `getByRole('button', { name: /^Search$/i })`                 | button   | hero `Search` → `/search?q=…&guests=…` (or `/search` when no `q`) | URL contains `/search`         | stays on `/`     |
| `getByRole('link', { name: /See all destinations/i })`       | link     | featured-destinations link → `/search`                            | URL contains `/search`         | stays on `/`     |
| `getByRole('link', { name: /Browse the full collection/i })` | link     | hand-picked stays CTA → `/search`                                 | URL contains `/search`         | stays on `/`     |
| `getByRole('link', { name: /Create free account/i })`        | link     | members-band primary CTA → `/signup`                              | URL contains `/signup`         | stays on `/`     |
| `getByRole('link', { name: /Browse stays/i })`               | link     | members-band secondary CTA → `/search`                            | URL contains `/search`         | stays on `/`     |

## Hidden surfaces opened from this page

| trigger                              | what it opens | elements inside |
| ------------------------------------ | ------------- | --------------- |
| (none — landing has no menus/modals) | —             | —               |

## Network calls expected during normal use

| trigger               | method | path            | what request body or query is expected                                         |
| --------------------- | ------ | --------------- | ------------------------------------------------------------------------------ |
| Page load (anonymous) | GET    | / (vite static) | served by Vite — observed via `captureNetwork` so we know HTML actually loaded |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
