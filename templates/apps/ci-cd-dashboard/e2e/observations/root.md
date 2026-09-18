# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction | success signal        | failure signal |
| ---------------------------------------------------------------- | ------- | -------------------------------- | --------------------- | -------------- |
| `getByRole('link', { name: /Conduit/i }).first()`                | link    | nav brand link to home `/`       | URL is `/`            | other URL      |
| `getByRole('link', { name: /^Sign in$/i }).first()`              | link    | navbar "Sign in" → `/login`      | URL becomes `/login`  | stays on `/`   |
| `getByRole('link', { name: /Start free/i }).first()`             | link    | navbar "Start free" → `/signup`  | URL becomes `/signup` | stays on `/`   |
| `getByRole('heading', { name: /Ship with certainty/i }).first()` | heading | hero h1 visible                  | element rendered      | not rendered   |
| `getByRole('link', { name: /Choose plan/i }).nth(0)`             | link    | Starter pricing CTA → `/signup`  | URL becomes `/signup` | stays          |
| `getByRole('link', { name: /Choose plan/i }).nth(1)`             | link    | Team pricing CTA → `/signup`     | URL becomes `/signup` | stays          |
| `getByRole('link', { name: /Choose plan/i }).nth(2)`             | link    | Pro pricing CTA → `/signup`      | URL becomes `/signup` | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger                            | method | path | what request body or query is expected |
| ---------------------------------- | ------ | ---- | -------------------------------------- |
| (page load — public, no API calls) | n/a    | n/a  | no /api requests on initial render     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
