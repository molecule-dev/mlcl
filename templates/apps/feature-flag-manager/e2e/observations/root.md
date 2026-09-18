# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                | role    | expected behavior on interaction | success signal       | failure signal |
| ------------------------------------------------------------------------- | ------- | -------------------------------- | -------------------- | -------------- |
| `getByRole('link', { name: 'Pricing' })` (header)                         | link    | navigate to /pricing             | URL becomes /pricing | stays on /     |
| `getByRole('link', { name: /sign in/i })` (header)                        | link    | navigate to /login               | URL becomes /login   | stays on /     |
| `getByRole('link', { name: /start free/i }).first()` (hero CTA)           | link    | navigate to /signup              | URL becomes /signup  | stays on /     |
| `getByRole('heading', { level: 1, name: /ship fearlessly/i })`            | heading | render hero headline             | visible              | absent         |
| `getByRole('link', { name: /choose plan/i }).first()` (Free pricing card) | link    | route to /signup                 | URL becomes /signup  | stays on /     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

(none — landing is a fully static marketing page; no API calls fire)

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/01-root.spec.ts`
