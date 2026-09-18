# Page observations: /gallery (gallery)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role            | expected behavior on interaction | success signal                       | failure signal |
| --------------------------------------------------------- | --------------- | -------------------------------- | ------------------------------------ | -------------- |
| `getByRole("heading", { name: /^Gallery$/i, level: 1 })`  | heading         | render Gallery heading           | visible                              | absent         |
| `getByRole("button", { name: /^All$/i })` (status filter) | button (filter) | show all images                  | aria-pressed=true                    | no toggle      |
| `getByRole("button", { name: /^Complete$/i })`            | button (filter) | filter by complete               | aria-pressed=true                    | no toggle      |
| `getByRole("button", { name: /In flight/i })`             | button (filter) | filter by in-flight              | aria-pressed=true                    | no toggle      |
| `getByRole("button", { name: /Upscaled/i })`              | button (filter) | filter by upscaled               | aria-pressed=true                    | no toggle      |
| `getByRole("button", { name: /^Failed$/i })`              | button (filter) | filter by failed                 | aria-pressed=true                    | no toggle      |
| `getByRole("button", { name: /Export all/i })`            | button          | export gallery zip               | request issued or download triggered | no action      |
| `getByRole("link")` (any image card)                      | link            | navigate to /images/:id          | URL becomes /images/UUID             | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path             | what request body or query is expected |
| --------- | ------ | ---------------- | -------------------------------------- |
| page load | GET    | /api/generations | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/gallery.spec.ts`
