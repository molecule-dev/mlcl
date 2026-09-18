# Page observations: /pricing (pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role                    | expected behavior on interaction | success signal     | failure signal |
| --------------------------------------------------- | ----------------------- | -------------------------------- | ------------------ | -------------- |
| `getByRole("heading", { name: /Choose your.*plan    | Pricing/i, level: 1 })` | heading                          | render top heading | visible        | absent |
| `getByRole("article")` × 3 plan cards               | article                 | render three pricing tier cards  | count >= 3         | fewer than 3   |
| `getByRole("heading", { name: /Free/i, level: 2 })` | heading                 | show Free tier                   | visible            | absent         |
| `getByRole("heading", { name: /Pro/i, level: 2 })`  | heading                 | show Pro tier                    | visible            | absent         |
| `getByRole("heading", { name: /Team/i, level: 2 })` | heading                 | show Team tier                   | visible            | absent         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path       | what request body or query is expected |
| -------------- | ------ | ---------- | -------------------------------------- |
| Initial render | GET    | /api/plans | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
