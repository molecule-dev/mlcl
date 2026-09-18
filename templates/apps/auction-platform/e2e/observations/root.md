# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                     | success signal                   | failure signal      |
| ----------------------------------------------------------- | ------- | ---------------------------------------------------- | -------------------------------- | ------------------- |
| `getByRole("link", { name: /Gavl/i }).first()`              | link    | navigate back to / (top-of-page anchor)              | URL stays on /                   | navigates elsewhere |
| `getByRole("link", { name: /Sign in/i })`                   | link    | navigate to /login                                   | URL becomes /login               | stays on /          |
| `getByRole("link", { name: /Start bidding/i }).first()`     | link    | navigate to /signup                                  | URL becomes /signup              | stays on /          |
| `getByRole("link", { name: /^Browse auctions$/i }).first()` | link    | navigate to /auctions (logged-out → /login redirect) | URL contains /auctions or /login | stays on /          |
| `getByRole("link", { name: /Start selling/i })`             | link    | navigate to /signup                                  | URL becomes /signup              | stays on /          |
| `getByRole("heading", { name: /counts/i, level: 1 })`       | heading | render hero headline                                 | visible                          | absent              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected |
| --------- | ------ | --------------------- | -------------------------------------- |
| page load | GET    | /api/auctions?limit=4 | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
