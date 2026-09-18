# Page observations: /prompts (prompts)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role      | expected behavior on interaction                 | success signal                            | failure signal             |
| --------------------------------------------------------- | --------- | ------------------------------------------------ | ----------------------------------------- | -------------------------- |
| `getByRole("heading", { name: /Prompt lab/i, level: 1 })` | heading   | render Prompt Lab heading                        | visible                                   | absent                     |
| `getByRole("searchbox")`                                  | searchbox | filter prompts by text                           | list filters as user types                | no filtering               |
| `getByRole("listitem")` (prompt entries)                  | listitem  | render seeded prompts                            | count >= 4                                | fewer than 4               |
| `getByRole("button", { name: /Run/i }).first()`           | button    | PUT /api/prompts/:id/run + redirect to /generate | request issued OR navigation to /generate | no network call and no nav |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| page load | GET    | /api/prompts         | (none)                                 |
| Run click | PUT    | /api/prompts/:id/run | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/prompts.spec.ts`
